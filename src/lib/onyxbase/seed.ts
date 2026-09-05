/**
 * Seed Onyx Base with categories, prompts (referencing local image links), and site config.
 * Run: `bun run src/lib/onyxbase/seed.ts`
 *
 * Idempotent: skips records that already exist (by slug/id).
 */
import {
  getOnyxBase,
  COLLECTIONS,
  categoryService,
  promptService,
  settingsService,
} from "./index";
import type { Prompt } from "./types";

const img = (slug: string) => `/seed-img/${slug}.png`;

const categories = [
  { id: "cat_ai_art", name: "AI Art", slug: "ai-art", description: "Generative art & image prompts", featured: true, imageUrl: null },
  { id: "cat_writing", name: "Writing", slug: "writing", description: "Copywriting, fiction & content", featured: true, imageUrl: null },
  { id: "cat_coding", name: "Coding", slug: "coding", description: "Development, review & architecture", featured: true, imageUrl: null },
  { id: "cat_marketing", name: "Marketing", slug: "marketing", description: "Ads, growth & conversion", featured: true, imageUrl: null },
  { id: "cat_photography", name: "Photography", slug: "photography", description: "Camera & rendering styles", featured: true, imageUrl: null },
  { id: "cat_business", name: "Business", slug: "business", description: "Strategy, ops & analysis", featured: false, imageUrl: null },
  { id: "cat_productivity", name: "Productivity", slug: "productivity", description: "Focus, planning & workflows", featured: false, imageUrl: null },
  { id: "cat_education", name: "Education", slug: "education", description: "Lessons, study & research", featured: false, imageUrl: null },
  { id: "cat_social", name: "Social Media", slug: "social-media", description: "Posts, captions & hooks", featured: false, imageUrl: null },
  { id: "cat_research", name: "Research", slug: "research", description: "Literature, synthesis & analysis", featured: false, imageUrl: null },
];

type SeedPrompt = Omit<Prompt, "createdAt" | "updatedAt" | "views" | "copies" | "likes" | "saves" | "id"> & {
  id: string;
  views: number;
  copies: number;
  likes: number;
  saves: number;
};

const prompts: SeedPrompt[] = [
  {
    id: "p_cinematic_product",
    slug: "cinematic-product-photography",
    title: "Cinematic Product Photography",
    description: "Generate premium cinematic product photography with dramatic rim lighting and a luxury commercial aesthetic.",
    prompt: `[SYSTEM]
You are a world-class commercial product photographer and AI image director.

[SUBJECT]
A single hero product, centered, clean and uncluttered composition.

[STYLE]
Cinematic, luxury, premium advertising aesthetic. Editorial commercial photography. Ultra-detailed, 8k, sharp focus on product.

[LIGHTING]
Dramatic rim lighting from behind and slightly to the side. Soft key light from the front-left. Deep blacks with controlled highlights. Subtle gold accent bounce.

[BACKGROUND]
Dark, reflective surface (polished black stone or glass). Faint gradient from charcoal to black. Optional faint atmospheric haze.

[CAMERA]
85mm macro lens, f/2.8, shallow depth of field, shot on medium format.

[NEGATIVE]
no text, no watermark, no clutter, no harsh direct flash, no oversaturation, no plastic look`,
    imageUrl: img("cinematic-product-photography"),
    imageAlt: "Cinematic product photography of a luxury perfume bottle",
    categoryId: "cat_photography",
    authorName: "Onyx Studio",
    tags: ["photography", "cinematic", "product", "commercial", "luxury"],
    featured: true,
    published: true,
    seoTitle: "Cinematic Product Photography Prompt — PromptVault",
    seoDescription: "AI prompt for generating premium cinematic product photography with dramatic lighting.",
    views: 12450,
    copies: 3210,
    likes: 840,
    saves: 412,
  },
  {
    id: "p_ultra_portrait",
    slug: "ultra-realistic-portrait",
    title: "Ultra-Realistic Portrait",
    description: "Produce photorealistic human portraits with natural skin texture, soft window light, and a professional headshot feel.",
    prompt: `[SYSTEM]
You are an award-winning portrait photographer.

[SUBJECT]
One person, head and shoulders, natural relaxed expression.

[STYLE]
Photorealistic, professional headshot, natural skin texture with visible pores and micro-detail, believable subsurface scattering.

[LIGHTING]
Soft directional window light from camera-left. Gentle fill from the right. Catchlights in both eyes. No harsh shadows.

[CAMERA]
85mm prime, f/1.8, full-frame sensor, shallow depth of field, neutral color science.

[BACKGROUND]
Blurred neutral interior, warm tones, bokeh.

[NEGATIVE]
no plastic skin, no over-smoothing, no cartoon, no extra fingers, no text`,
    imageUrl: img("ultra-realistic-portrait"),
    imageAlt: "Ultra realistic portrait with soft window light",
    categoryId: "cat_photography",
    authorName: "Onyx Studio",
    tags: ["portrait", "photography", "realistic", "headshot", "people"],
    featured: true,
    published: true,
    seoTitle: "Ultra-Realistic Portrait Prompt — PromptVault",
    seoDescription: "Generate photorealistic portraits with natural skin texture and soft light.",
    views: 9870,
    copies: 2210,
    likes: 612,
    saves: 305,
  },
  {
    id: "p_viral_thread",
    slug: "viral-twitter-thread",
    title: "Viral Twitter Thread Writer",
    description: "Turn any idea into a punchy, high-retention Twitter/X thread with strong hooks and a clear payoff.",
    prompt: `[ROLE]
You are a viral social media writer who specializes in high-retention threads.

[GOAL]
Turn the user's idea into a 7-tweet thread that earns saves and retweets.

[RULES]
1. Tweet 1 is the hook: bold claim + curiosity gap. Under 240 chars.
2. Tweets 2-6 each deliver one concrete idea with an example or mini-story.
3. Tweet 7 is the payoff: summarize, give a CTA, and invite a reply.
4. Use line breaks for scannability. No hashtags. No emojis unless they add meaning.
5. Write in a confident, conversational voice — second person ("you").

[INPUT]
{{idea}}

[OUTPUT]
Only the thread, numbered 1/ through 7/. No commentary.`,
    imageUrl: img("viral-twitter-thread"),
    imageAlt: "Viral social media thread illustration",
    categoryId: "cat_social",
    authorName: "Growth Lab",
    tags: ["twitter", "social media", "writing", "thread", "viral"],
    featured: true,
    published: true,
    seoTitle: "Viral Twitter Thread Writer Prompt — PromptVault",
    seoDescription: "Generate high-retention Twitter/X threads with strong hooks and clear payoffs.",
    views: 8120,
    copies: 1980,
    likes: 540,
    saves: 289,
  },
  {
    id: "p_code_review",
    slug: "code-review-assistant",
    title: "Senior Code Review Assistant",
    description: "Get a thorough, senior-level code review: bugs, security, performance, and maintainability — with concrete fixes.",
    prompt: `[ROLE]
You are a staff-level software engineer doing a rigorous code review.

[GOAL]
Review the code below for bugs, security issues, performance problems, readability, and maintainability.

[FORMAT]
Organize findings into sections:
1. **Blocking issues** — must fix before merge.
2. **Important** — should fix soon.
3. **Nitpicks** — optional polish.
For each issue: quote the relevant snippet, explain the problem, and give a concrete corrected version.

[RULES]
- Be specific, not generic. Quote real lines.
- Don't suggest changes without explaining why.
- Praise good patterns briefly.
- Assume the author is a competent peer; skip basics unless they're violated.

[CODE]
\`\`\`
{{code}}
\`\`\``,
    imageUrl: img("code-review-assistant"),
    imageAlt: "Code review with magnifying glass illustration",
    categoryId: "cat_coding",
    authorName: "DevTools",
    tags: ["coding", "code review", "engineering", "security", "quality"],
    featured: true,
    published: true,
    seoTitle: "Senior Code Review Assistant Prompt — PromptVault",
    seoDescription: "A staff-level code review prompt covering bugs, security, performance, and maintainability.",
    views: 11240,
    copies: 3040,
    likes: 720,
    saves: 501,
  },
  {
    id: "p_ad_copy",
    slug: "high-converting-ad-copy",
    title: "High-Converting Ad Copy Generator",
    description: "Write direct-response ad copy with a hook, agitation, solution, and CTA — variants for A/B testing included.",
    prompt: `[ROLE]
You are a direct-response copywriter who writes ads that convert.

[GOAL]
Write ad copy for the product below. Output 3 variants for A/B testing.

[FRAMEWORK]
Each variant follows Hook → Agitate → Solution → CTA:
- Hook: stop the scroll in 6 words.
- Agitate: name the pain the reader feels right now.
- Solution: introduce the product as the specific fix.
- CTA: one clear, low-friction next step.

[VARIANTS]
1. Benefit-led
2. Story-led
3. Contrarian / pattern-interrupt

[RULES]
- Plain language, 6th-grade reading level.
- No hype words ("revolutionary", "game-changing").
- One idea per sentence.
- Keep each variant under 120 words.

[PRODUCT]
{{product_description}}`,
    imageUrl: img("high-converting-ad-copy"),
    imageAlt: "Marketing ad copy concept illustration",
    categoryId: "cat_marketing",
    authorName: "Growth Lab",
    tags: ["marketing", "ad copy", "conversion", "copywriting", "ads"],
    featured: true,
    published: true,
    seoTitle: "High-Converting Ad Copy Generator — PromptVault",
    seoDescription: "Generate direct-response ad copy with hook, agitation, solution, and CTA in 3 variants.",
    views: 7630,
    copies: 2410,
    likes: 498,
    saves: 367,
  },
  {
    id: "p_swot",
    slug: "business-strategy-swot",
    title: "Business Strategy SWOT Analyst",
    description: "Produce a structured SWOT analysis with prioritized, actionable strategic recommendations from any business brief.",
    prompt: `[ROLE]
You are a strategy consultant at a top-tier firm.

[GOAL]
Produce a SWOT analysis and strategic recommendations from the brief below.

[OUTPUT STRUCTURE]
## SWOT
- **Strengths**: 4-5 bullets, evidence-based.
- **Weaknesses**: 4-5 bullets, honest and specific.
- **Opportunities**: 4-5 bullets, tied to market trends.
- **Threats**: 4-5 bullets, external and quantified where possible.

## Strategic Priorities
Rank the top 3 priorities. For each: what to do, why now, expected impact, and key risk.

## 90-Day Plan
3 concrete next steps with owners and success metrics.

[RULES]
- No generic advice ("focus on customers"). Every point must be specific to the brief.
- Cite assumptions. Flag missing information.
- Be concise — executives are reading.

[BRIEF]
{{business_brief}}`,
    imageUrl: img("business-strategy-swot"),
    imageAlt: "Business strategy SWOT diagram",
    categoryId: "cat_business",
    authorName: "Strategy Desk",
    tags: ["business", "strategy", "swot", "consulting", "planning"],
    featured: false,
    published: true,
    seoTitle: "SWOT Strategy Analyst Prompt — PromptVault",
    seoDescription: "Turn any business brief into a structured SWOT with prioritized strategic recommendations.",
    views: 5410,
    copies: 1320,
    likes: 301,
    saves: 245,
  },
  {
    id: "p_pomodoro",
    slug: "deep-focus-pomodoro",
    title: "Deep Focus Pomodoro Coach",
    description: "A pomodoro-style focus coach that plans your session, guards against distraction, and reviews your output.",
    prompt: `[ROLE]
You are a focus coach who runs pomodoro sessions for knowledge workers.

[GOAL]
Run a 4-pomodoro deep-work session for the task below.

[SESSION PLAN]
For each of 4 pomodoros (25 min work + 5 min break), specify:
- **Goal**: the single outcome for this block.
- **Anti-distraction pact**: what you'll ignore and how.
- **Exit criteria**: how you'll know the block is done.

[FINAL REVIEW]
After pomodoro 4, answer:
- What got done vs. planned?
- What broke focus?
- One change for next session.

[RULES]
- One outcome per pomodoro. No multitasking.
- Breaks are non-negotiable. Suggest a physical reset.
- If the task is too big for 4 pomodoros, say so and propose a slice.

[TASK]
{{task}}`,
    imageUrl: img("deep-focus-pomodoro"),
    imageAlt: "Pomodoro timer on a clean desk",
    categoryId: "cat_productivity",
    authorName: "Focus Lab",
    tags: ["productivity", "focus", "pomodoro", "deep work", "planning"],
    featured: false,
    published: true,
    seoTitle: "Deep Focus Pomodoro Coach Prompt — PromptVault",
    seoDescription: "Plan and run structured pomodoro deep-work sessions with anti-distraction pacts.",
    views: 4890,
    copies: 1190,
    likes: 267,
    saves: 312,
  },
  {
    id: "p_lesson_plan",
    slug: "lesson-plan-generator",
    title: "Lesson Plan Generator",
    description: "Create a structured, engaging lesson plan with objectives, activities, assessment, and differentiation.",
    prompt: `[ROLE]
You are an experienced instructional designer.

[GOAL]
Create a complete lesson plan for the topic and audience below.

[OUTPUT STRUCTURE]
1. **Learning objectives** — 3 measurable outcomes ("Students will be able to...").
2. **Hook** — a 5-minute opener that activates prior knowledge.
3. **Direct instruction** — core content, chunked, with 2 checks for understanding.
4. **Guided practice** — an activity students do with support.
5. **Independent practice** — what students do alone.
6. **Assessment** — how you'll measure the objectives (formative + summative).
7. **Differentiation** — supports for struggling learners and extensions for advanced ones.
8. **Materials** — list everything needed.

[RULES]
- Align every activity to an objective.
- Time-box each section.
- Keep it usable by a substitute teacher.

[INPUT]
Topic: {{topic}}
Grade/audience: {{audience}}
Duration: {{duration}}`,
    imageUrl: img("lesson-plan-generator"),
    imageAlt: "Lesson plan with open book illustration",
    categoryId: "cat_education",
    authorName: "EduCraft",
    tags: ["education", "lesson plan", "teaching", "instructional design", "classroom"],
    featured: false,
    published: true,
    seoTitle: "Lesson Plan Generator Prompt — PromptVault",
    seoDescription: "Generate structured lesson plans with objectives, activities, assessment, and differentiation.",
    views: 6210,
    copies: 1540,
    likes: 388,
    saves: 421,
  },
  {
    id: "p_insta_caption",
    slug: "instagram-caption-magnet",
    title: "Instagram Caption Magnet",
    description: "Write scroll-stopping Instagram captions with hooks, line breaks, and a natural CTA — plus hashtag sets.",
    prompt: `[ROLE]
You are a social media copywriter who writes captions people actually finish.

[GOAL]
Write 3 caption variants for the post described below.

[FRAMEWORK]
Each caption:
1. **Hook** (first line) — earns the "more" expansion.
2. **Body** — 3-5 short lines, one idea each, line breaks between.
3. **CTA** — a natural question or invite (not "link in bio" unless asked).

[VARIANTS]
1. Storytelling
2. List / value bombs
3. Hot-take / contrarian

[RULES]
- Read it aloud. If it sounds like an ad, rewrite.
- Max 6 emojis total across all variants.
- No hashtag stuffing in the body.

[HASHTAGS]
Provide 3 sets of 10 hashtags each: broad, niche, community.

[POST]
{{post_description}}`,
    imageUrl: img("instagram-caption-magnet"),
    imageAlt: "Instagram engagement flatlay",
    categoryId: "cat_social",
    authorName: "Growth Lab",
    tags: ["instagram", "social media", "caption", "copywriting", "engagement"],
    featured: false,
    published: true,
    seoTitle: "Instagram Caption Magnet Prompt — PromptVault",
    seoDescription: "Write scroll-stopping Instagram captions with hooks, line breaks, and natural CTAs.",
    views: 7140,
    copies: 2010,
    likes: 456,
    saves: 398,
  },
  {
    id: "p_lit_review",
    slug: "literature-review-synthesizer",
    title: "Literature Review Synthesizer",
    description: "Synthesize multiple sources into a coherent literature review with themes, gaps, and a citation-ready structure.",
    prompt: `[ROLE]
You are an academic research assistant.

[GOAL]
Synthesize the sources below into a coherent literature review.

[OUTPUT STRUCTURE]
1. **Scope** — one paragraph framing the review's question and boundaries.
2. **Themes** — group findings into 3-5 themes. Under each, compare what sources agree and disagree on.
3. **Gaps** — what's missing in the literature, explicitly.
4. **Synthesis** — your integrative read: where does the field stand?
5. **Open questions** — 3 questions future work should answer.

[RULES]
- Attribute claims to sources by [Author, Year].
- Never invent citations. If unsure, say "source unclear".
- Distinguish consensus from single-study findings.
- Neutral, scholarly tone.

[SOURCES]
{{sources}}`,
    imageUrl: img("literature-review-synthesizer"),
    imageAlt: "Literature review research concept",
    categoryId: "cat_research",
    authorName: "Research Desk",
    tags: ["research", "literature review", "academic", "synthesis", "writing"],
    featured: false,
    published: true,
    seoTitle: "Literature Review Synthesizer Prompt — PromptVault",
    seoDescription: "Synthesize multiple sources into a structured literature review with themes and gaps.",
    views: 3980,
    copies: 980,
    likes: 212,
    saves: 287,
  },
];

async function seed() {
  console.log("Seeding Onyx Base…");
  const ob = getOnyxBase();
  const health = await ob.health();
  console.log("Onyx Base health:", health.status, "user:", health.user);

  // 1. Site config
  await settingsService.get();
  console.log("✓ site config ensured");

  // 2. Categories
  for (const c of categories) {
    const existing = await categoryService.getBySlug(c.slug);
    if (existing) {
      console.log(`↻ category exists: ${c.name}`);
      continue;
    }
    await categoryService.create(c);
    console.log(`✓ category: ${c.name}`);
  }

  // 3. Prompts
  for (const p of prompts) {
    const existing = await promptService.getBySlug(p.slug);
    if (existing) {
      console.log(`↻ prompt exists: ${p.title}`);
      continue;
    }
    const { id, ...rest } = p;
    await promptService.create({ ...rest, id });
    console.log(`✓ prompt: ${p.title}`);
  }

  console.log("\nSeed complete. Total prompts:", prompts.length, "categories:", categories.length);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
