import ZAI from "z-ai-web-dev-sdk";
import * as fs from "fs";
import * as path from "path";

/**
 * AI PromptLab — text-only AI layer.
 *
 * Architecture: every feature calls the LLM, parses a STRICT JSON response, and
 * returns a typed object. The frontend NEVER consumes free-form AI output — it
 * only ever renders these structured results.
 *
 * The z-ai-web-dev-sdk reads its config from a .z-ai-config file. On Vercel
 * (serverless) there's no persistent filesystem, so we bootstrap the config
 * from the ZAI_CONFIG env var (set as a Vercel secret) at module load.
 */

// ─── core helper ────────────────────────────────────────────
let _zai: any = null;
async function getLLM() {
  if (!_zai) {
    // On serverless (Vercel), write the config from env to a file the SDK can read.
    // The SDK checks process.cwd(), $HOME, and /etc — only $HOME is reliably writable.
    const envCfg = process.env.ZAI_CONFIG;
    if (envCfg) {
      const home = process.env.HOME || process.env.HOMEPATH || "/tmp";
      const candidates = [
        path.join(home, ".z-ai-config"),
        path.join(process.cwd(), ".z-ai-config"),
        "/tmp/.z-ai-config",
      ];
      for (const cfgPath of candidates) {
        try { fs.writeFileSync(cfgPath, envCfg); break; } catch { /* try next */ }
      }
    }
    _zai = await ZAI.create();
  }
  return _zai;
}

/** Call the LLM and parse a strict JSON object from its response. */
async function generateJSON<T = any>(
  systemPrompt: string,
  userPrompt: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const zai = await getLLM();
  const res = await zai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: opts.temperature ?? 0.7,
  });
  const content = res.choices?.[0]?.message?.content || "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no JSON object.");
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    throw new Error("AI returned invalid JSON.");
  }
}

function clamp(v: any, max: number): string {
  if (v == null) return "";
  return String(v).slice(0, max);
}
function strArray(v: any, max = 20): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x: any) => String(x).trim()).filter(Boolean))].slice(0, max);
}

// ─── Phase 1 features ───────────────────────────────────────

/** 1. Prompt Enhancer — rewrite a rough prompt into a clearer, more effective version. */
export interface EnhanceResult {
  enhanced_prompt: string;
  changes: string[];
  before_summary: string;
  after_summary: string;
}
export async function enhancePrompt(prompt: string): Promise<EnhanceResult> {
  return generateJSON<EnhanceResult>(
    `You are a prompt engineering expert. Rewrite the user's rough prompt into a clearer, more effective version with explicit structure (use [SYSTEM]/[GOAL]/[CONTEXT]/[CONSTRAINTS]/[OUTPUT] sections when relevant). Return ONLY JSON with keys: enhanced_prompt (string), changes (array of short strings describing what you improved), before_summary (string, ≤160 chars), after_summary (string, ≤160 chars).`,
    `Prompt to enhance:\n"""\n${prompt.slice(0, 4000)}\n"""`
  );
}

/** 2. Prompt Generator — user gives an idea → AI creates a complete prompt. */
export interface GenerateResult {
  prompt: string;
  title: string;
  description: string;
  tags: string[];
  suggested_category: string;
}
export async function generatePrompt(idea: string, style?: string): Promise<GenerateResult> {
  return generateJSON<GenerateResult>(
    `You are a prompt engineering expert. Turn the user's idea into a complete, ready-to-use AI prompt with clear sections. Return ONLY JSON with keys: prompt (string, the full prompt with [SECTION] headers), title (string, ≤80 chars), description (string, ≤200 chars), tags (array of 3-8 lowercase strings), suggested_category (string).`,
    `Idea: ${idea.slice(0, 1000)}\nPreferred style/model: ${style || "general"}\n\nGenerate the complete prompt.`
  );
}

/** 3. Prompt Explainer — explain what each section of a prompt does. */
export interface ExplainResult {
  summary: string;
  sections: Array<{ name: string; purpose: string; effectiveness: string }>;
  overall_intent: string;
  tips: string[];
}
export async function explainPrompt(prompt: string): Promise<ExplainResult> {
  return generateJSON<ExplainResult>(
    `You are a prompt analyst. Break down the user's prompt and explain what each part does. Return ONLY JSON with keys: summary (string, ≤200 chars), sections (array of {name, purpose, effectiveness} where effectiveness is "strong"|"moderate"|"weak"), overall_intent (string), tips (array of 3-5 short improvement tips).`,
    `Prompt to explain:\n"""\n${prompt.slice(0, 4000)}\n"""`
  );
}

/** 4. Prompt Remix — generate multiple alternative versions. */
export interface RemixResult {
  variants: Array<{ label: string; prompt: string; difference: string }>;
}
export async function remixPrompt(prompt: string, count = 3): Promise<RemixResult> {
  return generateJSON<RemixResult>(
    `You are a prompt engineer. Create ${count} distinct alternative versions of the user's prompt, each with a different angle (e.g. more concise, more detailed, different tone). Return ONLY JSON with key: variants (array of {label, prompt, difference}).`,
    `Original prompt:\n"""\n${prompt.slice(0, 4000)}\n"""\n\nGenerate ${count} variants.`
  );
}

/** 5. Prompt Quality Score — analyze clarity, specificity, structure, constraints, context. */
export interface QualityResult {
  score: number;
  breakdown: { clarity: number; specificity: number; structure: number; constraints: number; context: number; output_clarity: number };
  issues: string[];
  suggestions: string[];
}
export async function scoreQuality(prompt: string): Promise<QualityResult> {
  const r = await generateJSON<any>(
    `You are a prompt quality auditor. Score the prompt 0-100 across 6 dimensions (each 0-100). Return ONLY JSON with keys: score (number, overall), breakdown (object with keys clarity, specificity, structure, constraints, context, output_clarity — each a number 0-100), issues (array of short strings), suggestions (array of short strings).`,
    `Prompt to score:\n"""\n${prompt.slice(0, 4000)}\n"""`
  );
  return {
    score: Math.max(0, Math.min(100, Number(r.score) || 0)),
    breakdown: {
      clarity: Number(r.breakdown?.clarity) || 0,
      specificity: Number(r.breakdown?.specificity) || 0,
      structure: Number(r.breakdown?.structure) || 0,
      constraints: Number(r.breakdown?.constraints) || 0,
      context: Number(r.breakdown?.context) || 0,
      output_clarity: Number(r.breakdown?.output_clarity) || 0,
    },
    issues: strArray(r.issues, 10),
    suggestions: strArray(r.suggestions, 10),
  };
}

/** 6. Auto Tags + Description — generate metadata when a prompt is published. */
export interface AutoMetaResult {
  title: string;
  description: string;
  tags: string[];
  use_cases: string[];
}
export async function autoMeta(prompt: string): Promise<AutoMetaResult> {
  const r = await generateJSON<any>(
    `You are a prompt metadata generator. Analyze the prompt and produce metadata. Return ONLY JSON with keys: title (string, ≤80 chars, catchy), description (string, ≤200 chars), tags (array of 5-10 lowercase strings), use_cases (array of 3-5 short strings).`,
    `Prompt:\n"""\n${prompt.slice(0, 4000)}\n"""`
  );
  return {
    title: clamp(r.title, 80),
    description: clamp(r.description, 200),
    tags: strArray(r.tags, 10),
    use_cases: strArray(r.use_cases, 5),
  };
}

// ─── Phase 2 features ───────────────────────────────────────

/** 7. AI Search — convert natural-language search into keywords/filters. */
export interface AISearchResult {
  keywords: string[];
  tags: string[];
  intent: string;
  suggested_sort: "newest" | "popular" | "copied" | "liked" | "trending";
}
export async function aiSearch(query: string): Promise<AISearchResult> {
  const r = await generateJSON<any>(
    `You are a search assistant for a prompt library. Convert the user's natural-language query into structured search filters. Return ONLY JSON with keys: keywords (array of 3-6 strings to match against prompt text), tags (array of 0-5 lowercase tags), intent (string, ≤100 chars describing what they want), suggested_sort (one of: newest, popular, copied, liked, trending).`,
    `Search query: "${query.slice(0, 500)}"`
  );
  return {
    keywords: strArray(r.keywords, 6),
    tags: strArray(r.tags, 5),
    intent: clamp(r.intent, 100),
    suggested_sort: ["newest", "popular", "copied", "liked", "trending"].includes(r.suggested_sort) ? r.suggested_sort : "popular",
  };
}

/** 8. Similar Prompts — recommend related prompts by analyzing text. */
export interface SimilarResult {
  matches: Array<{ promptId: string; reason: string; score: number }>;
}
export async function findSimilar(targetPrompt: string, candidates: Array<{ id: string; title: string; prompt: string }>): Promise<SimilarResult> {
  // rank candidates by LLM
  const r = await generateJSON<any>(
    `You are a similarity engine. Given a target prompt and a list of candidate prompts (with ids), return the most similar ones. Return ONLY JSON with key: matches (array of {promptId, reason, score} where score is 0-100). Return at most 4 matches.`,
    `Target prompt:\n"""\n${targetPrompt.slice(0, 1500)}\n"""\n\nCandidates:\n${JSON.stringify(candidates.slice(0, 30).map((c) => ({ id: c.id, title: c.title, prompt: c.prompt.slice(0, 300) }))).slice(0, 6000)}`
  );
  return { matches: (r.matches || []).slice(0, 4).map((m: any) => ({ promptId: String(m.promptId), reason: clamp(m.reason, 120), score: Number(m.score) || 0 })) };
}

/** 9. Duplicate Detection — compare a new prompt against existing ones. */
export interface DupCheckResult {
  duplicates: Array<{ promptId: string; title: string; similarity: number; note: string }>;
  is_duplicate: boolean;
}
export async function detectDuplicates(newPrompt: string, existing: Array<{ id: string; title: string; prompt: string }>): Promise<DupCheckResult> {
  const r = await generateJSON<any>(
    `You are a duplicate detector. Compare the new prompt against existing prompts. Flag any that are ≥80% similar in intent or structure. Return ONLY JSON with keys: duplicates (array of {promptId, title, similarity (0-100), note}), is_duplicate (boolean, true if any similarity ≥85).`,
    `New prompt:\n"""\n${newPrompt.slice(0, 2000)}\n"""\n\nExisting prompts:\n${JSON.stringify(existing.slice(0, 40).map((p) => ({ id: p.id, title: p.title, prompt: p.prompt.slice(0, 250) }))).slice(0, 6000)}`
  );
  return {
    duplicates: (r.duplicates || []).map((d: any) => ({ promptId: String(d.promptId), title: clamp(d.title, 80), similarity: Number(d.similarity) || 0, note: clamp(d.note, 120) })),
    is_duplicate: !!r.is_duplicate,
  };
}

/** 10. Model Converter — rewrite a prompt for a different AI model's conventions. */
export interface ConvertResult {
  converted_prompt: string;
  target_model: string;
  changes: string[];
}
export async function convertForModel(prompt: string, targetModel: string): Promise<ConvertResult> {
  return generateJSON<ConvertResult>(
    `You are a prompt converter. Rewrite the user's prompt to follow the conventions and best practices of the target AI model. Return ONLY JSON with keys: converted_prompt (string), target_model (string), changes (array of short strings describing what you adapted).`,
    `Prompt:\n"""\n${prompt.slice(0, 4000)}\n"""\n\nTarget model: ${targetModel}`
  );
}

/** 11. Variable Generator — detect reusable parts and turn them into {variables}. */
export interface VariablesResult {
  templated_prompt: string;
  variables: Array<{ name: string; description: string; default: string; type: string }>;
}
export async function generateVariables(prompt: string): Promise<VariablesResult> {
  const r = await generateJSON<any>(
    `You are a prompt templating expert. Identify reusable parts of the prompt (subjects, styles, parameters) and replace them with {{variables}}. Return ONLY JSON with keys: templated_prompt (string, the prompt with {{variable}} placeholders), variables (array of {name, description, default, type} where type is "text"|"number"|"choice"|"style").`,
    `Prompt:\n"""\n${prompt.slice(0, 4000)}\n"""`
  );
  return {
    templated_prompt: clamp(r.templated_prompt, 8000),
    variables: (r.variables || []).slice(0, 15).map((v: any) => ({ name: clamp(v.name, 40), description: clamp(v.description, 120), default: clamp(v.default, 80), type: String(v.type || "text") })),
  };
}

/** 11b. Prompt Translator — translate while preserving structure and intent. */
export interface TranslateResult {
  translated_prompt: string;
  target_language: string;
  notes: string[];
}
export async function translatePrompt(prompt: string, targetLanguage: string): Promise<TranslateResult> {
  return generateJSON<TranslateResult>(
    `You are a prompt translator. Translate the prompt into the target language while preserving its structure, placeholders, and intent. Return ONLY JSON with keys: translated_prompt (string), target_language (string), notes (array of short strings about anything that didn't translate cleanly).`,
    `Prompt:\n"""\n${prompt.slice(0, 4000)}\n"""\n\nTarget language: ${targetLanguage}`
  );
}

// ─── Phase 3 features ───────────────────────────────────────

/** 12. AI Moderation — classify a prompt/comment as safe/spam/low-quality/abusive. */
export interface ModerationResult {
  classification: "safe" | "spam" | "low_quality" | "abusive" | "unclear";
  confidence: number;
  reasons: string[];
  recommended_action: "allow" | "review" | "hide" | "delete";
}
export async function moderateContent(text: string, kind: "prompt" | "comment" = "comment"): Promise<ModerationResult> {
  const r = await generateJSON<any>(
    `You are a content moderator for a public prompt library. Classify the ${kind}. Return ONLY JSON with keys: classification (one of: safe, spam, low_quality, abusive, unclear), confidence (0-100), reasons (array of short strings), recommended_action (one of: allow, review, hide, delete).`,
    `Text to moderate:\n"""\n${text.slice(0, 2000)}\n"""`
  );
  const cls = ["safe", "spam", "low_quality", "abusive", "unclear"].includes(r.classification) ? r.classification : "unclear";
  const act = ["allow", "review", "hide", "delete"].includes(r.recommended_action) ? r.recommended_action : "review";
  return { classification: cls as any, confidence: Math.max(0, Math.min(100, Number(r.confidence) || 0)), reasons: strArray(r.reasons, 5), recommended_action: act as any };
}

/** 13. Prompt Recommendations — recommend prompts based on context. */
export interface RecommendationResult {
  recommendations: Array<{ promptId: string; reason: string }>;
}
export async function recommend(context: { query?: string; currentPromptId?: string; currentTitle?: string }, candidates: Array<{ id: string; title: string; tags: string[] }>): Promise<RecommendationResult> {
  const r = await generateJSON<any>(
    `You are a recommendation engine for a prompt library. Given context and a list of candidate prompts, recommend the most relevant ones. Return ONLY JSON with key: recommendations (array of {promptId, reason}, max 5).`,
    `Context: ${JSON.stringify(context).slice(0, 500)}\n\nCandidates:\n${JSON.stringify(candidates.slice(0, 40).map((c) => ({ id: c.id, title: c.title, tags: c.tags }))).slice(0, 5000)}`
  );
  return { recommendations: (r.recommendations || []).slice(0, 5).map((m: any) => ({ promptId: String(m.promptId), reason: clamp(m.reason, 120) })) };
}

/** 14. Comment Summaries — summarize a long discussion thread. */
export interface CommentSummaryResult {
  summary: string;
  key_points: string[];
  sentiment: "positive" | "neutral" | "mixed" | "negative";
  participant_count: number;
}
export async function summarizeComments(comments: Array<{ author: string; content: string }>): Promise<CommentSummaryResult> {
  const r = await generateJSON<any>(
    `You are a discussion summarizer. Summarize the comment thread. Return ONLY JSON with keys: summary (string, ≤300 chars), key_points (array of 3-5 short strings), sentiment (one of: positive, neutral, mixed, negative), participant_count (number).`,
    `Comments:\n${JSON.stringify(comments.slice(0, 50).map((c) => ({ author: c.author, content: c.content.slice(0, 300) }))).slice(0, 6000)}`
  );
  return {
    summary: clamp(r.summary, 300),
    key_points: strArray(r.key_points, 5),
    sentiment: ["positive", "neutral", "mixed", "negative"].includes(r.sentiment) ? r.sentiment : "neutral",
    participant_count: Number(r.participant_count) || new Set(comments.map((c) => c.author)).size,
  };
}

/** 15. AI Collections — automatically group prompts into useful collections. */
export interface CollectionResult {
  collections: Array<{ name: string; description: string; promptIds: string[] }>;
}
export async function generateCollections(prompts: Array<{ id: string; title: string; prompt: string; tags: string[] }>): Promise<CollectionResult> {
  const r = await generateJSON<any>(
    `You are a prompt librarian. Group the given prompts into 3-7 useful thematic collections. Return ONLY JSON with key: collections (array of {name, description, promptIds} where promptIds is the array of ids belonging to that collection). Each prompt should appear in exactly one collection.`,
    `Prompts:\n${JSON.stringify(prompts.slice(0, 50).map((p) => ({ id: p.id, title: p.title, tags: p.tags, prompt: p.prompt.slice(0, 200) }))).slice(0, 8000)}`
  );
  return {
    collections: (r.collections || []).slice(0, 10).map((c: any) => ({
      name: clamp(c.name, 60),
      description: clamp(c.description, 200),
      promptIds: strArray(c.promptIds, 50),
    })),
  };
}

/** 16. Trending Explanation — analyze stats and explain what's trending. */
export interface TrendingResult {
  headline: string;
  insights: string[];
  top_rising: string[];
  recommendation: string;
}
export async function explainTrending(stats: {
  topPrompts: Array<{ title: string; views: number; copies: number; likes: number }>;
  topSearches: Array<{ term: string; count: number }>;
  totalViews: number;
  totalCopies: number;
}): Promise<TrendingResult> {
  const r = await generateJSON<any>(
    `You are a trends analyst for a prompt library. Given the stats, produce a human-readable trending report. Return ONLY JSON with keys: headline (string, ≤120 chars), insights (array of 3-5 short strings), top_rising (array of 3-5 prompt titles or topics that are rising), recommendation (string, ≤160 chars, what the site owner should do next).`,
    `Stats:\n${JSON.stringify(stats).slice(0, 5000)}`
  );
  return {
    headline: clamp(r.headline, 120),
    insights: strArray(r.insights, 5),
    top_rising: strArray(r.top_rising, 5),
    recommendation: clamp(r.recommendation, 160),
  };
}

// re-export the existing image metadata generator for backward compat
export { generateImageMetadata } from "@/lib/onyxbase/llm";
