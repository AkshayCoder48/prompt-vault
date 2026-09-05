import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "@/lib/onyxbase/analytics";
import { getVisitorId } from "@/lib/visitor";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id: visitorId } = await getVisitorId();
    await analyticsService.track(body.type, {
      promptId: body.promptId,
      visitorId,
      metadata: body.metadata,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to track event.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
