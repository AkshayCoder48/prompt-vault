import { NextRequest, NextResponse } from "next/server";
import { NextResponse as NR } from "next/server";
import { categoryService } from "@/lib/onyxbase/categories";
import { promptService } from "@/lib/onyxbase/prompts";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let category = await categoryService.getById(id);
    if (!category) category = await categoryService.getBySlug(id);
    if (!category) return NR.json({ ok: false, error: "Category not found." }, { status: 404 });
    const all = await promptService.listPublished();
    const items = all.filter((p) => p.categoryId === category.id);
    return NR.json({ ok: true, category, items, total: items.length });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NR.json(
      { ok: false, error: err.message || "Failed to load category.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
