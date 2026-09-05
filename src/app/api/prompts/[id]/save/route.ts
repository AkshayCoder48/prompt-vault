import { NextRequest, NextResponse } from "next/server";
import { promptService } from "@/lib/onyxbase/prompts";
import { interactionService } from "@/lib/onyxbase/interactions";
import { analyticsService } from "@/lib/onyxbase/analytics";
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
    const { saved } = await interactionService.toggleSave(id, visitorId);
    const updated = await promptService.adjustSave(id, saved ? 1 : -1);
    if (saved) {
      await analyticsService.track("prompt_save", { promptId: id, visitorId });
    }
    return NextResponse.json(
      { ok: true, saved, saves: updated?.saves ?? 0 },
      { headers: { "set-cookie": visitorCookieHeader(visitorId) } }
    );
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to toggle save.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
