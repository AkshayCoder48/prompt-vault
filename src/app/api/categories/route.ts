import { NextRequest, NextResponse } from "next/server";
import { categoryService } from "@/lib/onyxbase/categories";
import { analyticsService } from "@/lib/onyxbase/analytics";
import { getVisitorId } from "@/lib/visitor";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const categories = await categoryService.list();
    // track category view if slug present
    const slug = new URL(req.url).searchParams.get("slug");
    if (slug) {
      const { id: visitorId } = await getVisitorId();
      await analyticsService.track("category_view", { visitorId, metadata: { slug } });
    }
    return NextResponse.json({ ok: true, categories });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load categories.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
