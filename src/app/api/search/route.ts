import { NextRequest, NextResponse } from "next/server";
import { promptService } from "@/lib/onyxbase/prompts";
import { analyticsService } from "@/lib/onyxbase/analytics";
import { getVisitorId } from "@/lib/visitor";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 12, 60);
    const offset = Number(searchParams.get("offset")) || 0;

    const result = await promptService.search({ q, limit, offset, sort: "popular" });

    if (q.trim()) {
      const { id: visitorId } = await getVisitorId();
      await analyticsService.trackSearch(q, visitorId);
    }

    return NextResponse.json({
      ok: true,
      items: result.items,
      total: result.total,
      query: q,
      limit,
      offset,
    });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Search failed.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
