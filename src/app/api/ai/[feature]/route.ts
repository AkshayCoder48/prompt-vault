import { NextRequest, NextResponse } from "next/server";
import {
  enhancePrompt, generatePrompt, explainPrompt, remixPrompt, scoreQuality, autoMeta,
  aiSearch, findSimilar, detectDuplicates, convertForModel, generateVariables, translatePrompt,
  moderateContent, recommend, summarizeComments, generateCollections, explainTrending,
} from "@/lib/ai/llm";
import { promptService } from "@/lib/onyxbase/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HANDLERS: Record<string, (body: any, req: NextRequest) => Promise<any>> = {
  // Phase 1
  enhance: (b) => enhancePrompt(b.prompt || ""),
  generate: (b) => generatePrompt(b.idea || "", b.style),
  explain: (b) => explainPrompt(b.prompt || ""),
  remix: (b) => remixPrompt(b.prompt || "", Number(b.count) || 3),
  quality: (b) => scoreQuality(b.prompt || ""),
  "auto-meta": (b) => autoMeta(b.prompt || ""),
  // Phase 2
  "ai-search": (b) => aiSearch(b.query || ""),
  similar: async (b) => {
    const target = b.prompt || "";
    const candidates = Array.isArray(b.candidates) ? b.candidates : [];
    return findSimilar(target, candidates);
  },
  "duplicate-check": async (b) => {
    const existing = Array.isArray(b.existing) ? b.existing : [];
    return detectDuplicates(b.prompt || "", existing);
  },
  convert: (b) => convertForModel(b.prompt || "", b.targetModel || "general"),
  variables: (b) => generateVariables(b.prompt || ""),
  translate: (b) => translatePrompt(b.prompt || "", b.targetLanguage || "English"),
  // Phase 3
  moderate: (b) => moderateContent(b.text || "", b.kind || "comment"),
  recommend: async (b) => {
    const candidates = Array.isArray(b.candidates) ? b.candidates : [];
    return recommend(b.context || {}, candidates);
  },
  "comment-summary": (b) => summarizeComments(Array.isArray(b.comments) ? b.comments : []),
  "auto-collections": (b) => generateCollections(Array.isArray(b.prompts) ? b.prompts : []),
  trending: (b) => explainTrending(b.stats || {}),
};

/** POST /api/ai/<feature> — runs the AI tool and returns structured JSON. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ feature: string }> }
) {
  const { feature } = await params;
  const handler = HANDLERS[feature];
  if (!handler) {
    return NextResponse.json(
      { ok: false, error: `Unknown AI feature: ${feature}. Available: ${Object.keys(HANDLERS).join(", ")}` },
      { status: 404 }
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const result = await handler(body, req);
    return NextResponse.json({ ok: true, feature, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "AI request failed.", retryable: true },
      { status: 502 }
    );
  }
}

/** GET /api/ai/<feature> — list available features. */
export async function GET() {
  return NextResponse.json({ ok: true, features: Object.keys(HANDLERS) });
}
