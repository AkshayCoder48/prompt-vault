import { NextRequest, NextResponse } from "next/server";
import { commentService } from "@/lib/onyxbase/comments";
import { getVisitorId, visitorCookieHeader } from "@/lib/visitor";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id: visitorId } = await getVisitorId();
    const updated = await commentService.like(id, visitorId);
    return NextResponse.json(
      { ok: true, likes: updated?.likes ?? 0 },
      { headers: { "set-cookie": visitorCookieHeader(visitorId) } }
    );
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to like comment.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 400 }
    );
  }
}
