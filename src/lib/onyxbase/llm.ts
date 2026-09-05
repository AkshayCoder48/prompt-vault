import ZAI from "z-ai-web-dev-sdk";

export interface ImageMetadata {
  title: string;       // ≤100 chars (Pinterest limit)
  description: string; // ≤800 chars
  hook: string;        // short scroll-stopper
  alt_text: string;    // ≤500 chars, descriptive, no hashtags
  tags: string[];      // 5-15 normalized tags
  category: string;    // one of the site categories
}

const VALID_CATEGORIES = [
  "AI Art", "Writing", "Coding", "Marketing", "Photography",
  "Business", "Productivity", "Education", "Social Media", "Research",
];

/**
 * Generate structured metadata for a prompt-hosting image record.
 * Uses the LLM text API only (no image generation).
 */
export async function generateImageMetadata(input: {
  originalPrompt: string;
  authorName?: string;
  model?: string;
}): Promise<ImageMetadata> {
  const zai = await ZAI.create();

  const system = `You generate structured JSON metadata for an AI image gallery.
You return ONLY a valid JSON object — no markdown, no commentary, no code fences.
The JSON must have exactly these keys: title, description, hook, alt_text, tags, category.
- title: catchy, searchable, ≤100 chars. Based on the actual image concept, not generic clickbait.
- description: 1-3 sentence promotional description, ≤800 chars. No hashtags.
- hook: a single short scroll-stopping line, ≤80 chars.
- alt_text: concise, descriptive, accessible alt text describing the image, ≤500 chars, no hashtags, no keyword stuffing.
- tags: 5-15 lowercase, deduplicated, trimmed tags relevant to the image. Array of strings.
- category: one of exactly: ${VALID_CATEGORIES.join(", ")}`;

  const user = `Original prompt that produced the image:
"""
${(input.originalPrompt || "").slice(0, 3000)}
"""

Author: ${input.authorName || "unknown"}
Model: ${input.model || "unknown"}

Generate the metadata JSON now.`;

  const res = await zai.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
  });

  const content = res.choices?.[0]?.message?.content || "";

  // extract the JSON object even if wrapped in fences
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("LLM did not return JSON metadata.");
  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("LLM returned invalid JSON metadata.");
  }

  // normalize + validate
  const tags = Array.isArray(parsed.tags)
    ? [...new Set(parsed.tags.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean))].slice(0, 15)
    : [];
  let category = String(parsed.category || "AI Art");
  if (!VALID_CATEGORIES.includes(category)) category = "AI Art";

  return {
    title: clamp(parsed.title, 100) || "AI Image Inspiration",
    description: clamp(parsed.description, 800) || "",
    hook: clamp(parsed.hook, 80) || "Want to create images like this?",
    alt_text: clamp(parsed.alt_text, 500) || "AI-generated image",
    tags,
    category,
  };
}

function clamp(v: any, max: number): string {
  if (!v) return "";
  return String(v).slice(0, max);
}
