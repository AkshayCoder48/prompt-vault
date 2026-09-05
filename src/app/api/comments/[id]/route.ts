import { NextRequest, NextResponse } from "next/server";
import { commentService } from "@/lib/onyxbase/comments";
import { getVisitorId } from "@/lib/visitor";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

// Edit own comment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id: visitorId } = await getVisitorId();
    const body = await req.json().catch(() => ({}));
    const updated = await commentService.edit(id, visitorId, body.content || "");
    return NextResponse.json({ ok: true, comment: updated });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to edit comment.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 400 }
    );
  }
}

// Delete (soft) own comment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id: visitorId } = await getVisitorId();
    await commentService.remove(id, visitorId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to delete comment.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 400 }
    );
  }
}
