import { NextRequest, NextResponse } from "next/server";
import { promptService } from "@/lib/onyxbase/prompts";
import { categoryService } from "@/lib/onyxbase/categories";
import { settingsService } from "@/lib/onyxbase/settings";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const sort = (searchParams.get("sort") as any) || "newest";
    const featured = searchParams.get("featured") === "true";
    const limit = Math.min(Number(searchParams.get("limit")) || 12, 60);
    const offset = Number(searchParams.get("offset")) || 0;

    const [result, categories] = await Promise.all([
      promptService.search({ q, category, tag, sort, featured, limit, offset }),
      categoryService.list(),
    ]);

    return NextResponse.json({
      ok: true,
      items: result.items,
      total: result.total,
      limit,
      offset,
      categories,
    });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load prompts.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
