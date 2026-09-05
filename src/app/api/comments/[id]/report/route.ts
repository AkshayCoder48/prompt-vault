import { NextRequest, NextResponse } from "next/server";
import { commentService } from "@/lib/onyxbase/comments";
import { getVisitorId } from "@/lib/visitor";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id: visitorId } = await getVisitorId();
    const body = await req.json().catch(() => ({}));
    await commentService.report(id, body.reason || "reported", visitorId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to report comment.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 400 }
    );
  }
}
