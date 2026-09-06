import { NextRequest, NextResponse } from "next/server";
import { promptService } from "@/lib/onyxbase/prompts";
import { findSimilar } from "@/lib/ai/llm";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/prompts/[id]/similar — AI-powered similar prompts. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const target = await promptService.getById(id);
    if (!target) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    const all = await promptService.listPublished();
    const candidates = all
      .filter((p) => p.id !== target.id)
      .map((p) => ({ id: p.id, title: p.title, prompt: p.prompt }));
    const result = await findSimilar(target.prompt, candidates);
    // hydrate the matched ids into full prompts
    const byId = new Map(all.map((p) => [p.id, p]));
    const matches = result.matches
      .map((m) => {
        const p = byId.get(m.promptId);
        return p ? { prompt: p, reason: m.reason, score: m.score } : null;
      })
      .filter(Boolean) as Array<{ prompt: any; reason: string; score: number }>;
    return NextResponse.json({ ok: true, matches });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
