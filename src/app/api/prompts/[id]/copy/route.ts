import { NextRequest, NextResponse } from "next/server";
import { promptService } from "@/lib/onyxbase/prompts";
import { analyticsService } from "@/lib/onyxbase/analytics";
import { getVisitorId } from "@/lib/visitor";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { id: visitorId } = await getVisitorId();
    await Promise.all([
      promptService.incrementCopy(id),
      analyticsService.track("prompt_copy", { promptId: id, visitorId }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to track copy.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
