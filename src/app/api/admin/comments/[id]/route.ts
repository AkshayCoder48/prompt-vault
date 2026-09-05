import { NextRequest, NextResponse } from "next/server";
import { commentService } from "@/lib/onyxbase/comments";
import { verifyAdmin } from "@/lib/admin";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    let updated = null;
    if (body.action === "approve") updated = await commentService.setStatus(id, "published");
    else if (body.action === "hide") updated = await commentService.setStatus(id, "hidden");
    else if (body.action === "delete") {
      await commentService.adminRemove(id);
      updated = { status: "deleted" };
    } else if (body.status) updated = await commentService.setStatus(id, body.status);
    return NextResponse.json({ ok: true, comment: updated });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { id } = await params;
    await commentService.adminRemove(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
