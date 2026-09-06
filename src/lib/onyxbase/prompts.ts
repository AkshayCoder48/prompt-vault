import { getOnyxBase, COLLECTIONS } from "./client";
import type { Prompt, PromptFilters } from "./types";
import { categoryService } from "./categories";

const KEY_PREFIXES = ["prompt:", "prompts:"];

function key(id: string) {
  return `${KEY_PREFIXES[0]}${id}`;
}

/** Strip any known key prefix (prompt: or prompts:) to get the bare id. */
function fromId(k: string) {
  for (const p of KEY_PREFIXES) {
    if (k.startsWith(p)) return k.slice(p.length);
  }
  return k;
}

/** Derive a short title from a prompt's first line / first sentence. */
function deriveTitle(prompt: string): string {
  const text = (prompt || "").trim();
  if (!text) return "Untitled";
  // strip leading [SECTION] markers
  const cleaned = text.replace(/^\[[A-Z _-]+\]\s*/i, "").trim();
  const firstLine = cleaned.split("\n")[0];
  const firstSentence = firstLine.split(/[.!]/)[0];
  const t = (firstSentence || firstLine).trim();
  if (t.length <= 70) return t;
  return t.slice(0, 67).trim() + "…";
}

/** Derive a description from the prompt (first ~160 chars). */
function deriveDescription(prompt: string): string {
  const text = (prompt || "").trim();
  if (!text) return "";
  const flat = text.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (flat.length <= 160) return flat;
  return flat.slice(0, 157).trim() + "…";
}

/** Normalise a raw stored record into a Prompt. Accepts both the full schema
 *  and a minimal schema ({prompt, imageUrl, author, sourceUrl, sourceId, model, pinterest}). */
function normalize(rec: { key: string; value: any; updatedAt?: string }): Prompt {
  const v = rec.value || {};
  const id = fromId(rec.key);
  const promptText = v.prompt || "";
  // `author` (flat) maps to `authorName`; `pinterest` is preserved as flat object
  return {
    id,
    slug: v.slug || id,
    title: v.title || deriveTitle(promptText),
    description: v.description || deriveDescription(promptText),
    prompt: promptText,
    imageUrl: v.imageUrl ?? v.previewUrl ?? null,
    imageAlt: v.imageAlt ?? null,
    categoryId: v.categoryId || null, // null = Uncategorized
    authorName: v.authorName || v.author || "Anonymous",
    tags: Array.isArray(v.tags) ? v.tags : [],
    featured: !!v.featured,
    published: v.published !== false, // default true
    seoTitle: v.seoTitle ?? null,
    seoDescription: v.seoDescription ?? null,
    views: Number(v.views) || 0,
    copies: Number(v.copies) || 0,
    likes: Number(v.likes) || 0,
    saves: Number(v.saves) || 0,
    subdomain: v.subdomain ?? null,
    // flat source fields (minimal schema)
    sourceUrl: v.sourceUrl ?? null,
    sourceId: v.sourceId ?? null,
    model: v.model ?? null,
    previewUrl: v.previewUrl ?? null,
    pinterest: v.pinterest ?? null,
    createdAt: v.createdAt || rec.updatedAt || new Date().toISOString(),
    updatedAt: v.updatedAt || rec.updatedAt || new Date().toISOString(),
  };
}

export const promptService = {
  /** Find the raw record + the key it's stored under (tries all prefixes). */
  async _findRaw(id: string): Promise<{ key: string; value: any; updatedAt?: string } | null> {
    const ob = getOnyxBase();
    for (const k of [`prompts:${id}`, key(id), id]) {
      const rec = await ob.get<any>(COLLECTIONS.prompts, k);
      if (rec) return { key: k, value: rec.value, updatedAt: rec.updatedAt };
    }
    return null;
  },

  async getById(id: string): Promise<Prompt | null> {
    const raw = await this._findRaw(id);
    if (!raw) return null;
    return normalize(raw);
  },

  async getBySlug(slug: string): Promise<Prompt | null> {
    const all = await this.listAll();
    return all.find((p) => p.slug === slug) || null;
  },

  /** Look up a published prompt by its subdomain slug. */
  async getBySubdomain(subdomain: string): Promise<Prompt | null> {
    const all = await this.listPublished();
    const sd = subdomain.toLowerCase().trim();
    return all.find((p) => (p.subdomain || "").toLowerCase() === sd) || null;
  },

  /** Fetch the whole collection (single GraphQL round-trip). Dedupes by id
   *  in case the same prompt exists under both `prompt:` and `prompts:` keys. */
  async listAll(): Promise<Prompt[]> {
    const ob = getOnyxBase();
    const recs = await ob.listCollection<Partial<Prompt>>(COLLECTIONS.prompts, 500);
    const seen = new Map<string, Prompt>();
    for (const r of recs) {
      const p = normalize(r);
      // prefer the `prompts:`-prefixed record when both exist
      if (!seen.has(p.id) || r.key.startsWith("prompts:")) {
        seen.set(p.id, p);
      }
    }
    return [...seen.values()];
  },

  async listPublished(): Promise<Prompt[]> {
    return (await this.listAll()).filter((p) => p.published);
  },

  async getFeatured(limit = 6): Promise<Prompt[]> {
    const all = await this.listPublished();
    return all.filter((p) => p.featured).slice(0, limit);
  },

  async getRelated(prompt: Prompt, limit = 4): Promise<Prompt[]> {
    const all = await this.listPublished();
    return all
      .filter((p) => p.id !== prompt.id)
      .map((p) => {
        let score = 0;
        if (p.categoryId === prompt.categoryId) score += 3;
        score += p.tags.filter((t) => prompt.tags.includes(t)).length * 2;
        score += Math.log10((p.views || 1) + 1);
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.p);
  },

  /** Search + filter + sort, all driven by database content. */
  async search(filters: PromptFilters = {}): Promise<{ items: Prompt[]; total: number }> {
    let items = await this.listPublished();

    if (filters.category) {
      // Resolve the category (by slug or id) and filter prompts by promptIds membership.
      const cat = await categoryService.getBySlug(filters.category).catch(() => null)
        || await categoryService.getById(filters.category).catch(() => null);
      if (cat && cat.promptIds?.length) {
        const idSet = new Set(cat.promptIds);
        items = items.filter((p) => idSet.has(p.id) || idSet.has(p.slug));
      } else if (cat) {
        // category exists but has no promptIds — match by legacy categoryId
        items = items.filter((p) => p.categoryId === cat.id || p.categoryId === cat.slug);
      }
    }
    if (filters.tag) {
      items = items.filter((p) => p.tags.map((t) => t.toLowerCase()).includes(filters.tag!.toLowerCase()));
    }
    if (filters.featured) {
      items = items.filter((p) => p.featured);
    }
    if (filters.q) {
      const q = filters.q.toLowerCase().trim();
      items = items.filter((p) => {
        const haystack = [p.title, p.description, p.prompt, p.authorName, p.tags.join(" "), p.categoryId || ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    // sort
    const sort = filters.sort || "newest";
    items = [...items];
    switch (sort) {
      case "popular":
        items.sort((a, b) => b.views - a.views);
        break;
      case "copied":
        items.sort((a, b) => b.copies - a.copies);
        break;
      case "liked":
        items.sort((a, b) => b.likes - a.likes);
        break;
      case "trending":
        items.sort((a, b) => b.views + b.copies * 3 + b.likes * 2 - (a.views + a.copies * 3 + a.likes * 2));
        break;
      case "featured":
        items.sort((a, b) => Number(b.featured) - Number(a.featured) || b.views - a.views);
        break;
      case "newest":
      default:
        items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }

    const total = items.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 12;
    return { items: items.slice(offset, offset + limit), total };
  },

  async getPopular(limit = 6): Promise<Prompt[]> {
    const all = await this.listPublished();
    return [...all].sort((a, b) => b.views - a.views).slice(0, limit);
  },

  async getLatest(limit = 8): Promise<Prompt[]> {
    const all = await this.listPublished();
    return [...all].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit);
  },

  async getAllTags(): Promise<string[]> {
    const all = await this.listPublished();
    const set = new Set<string>();
    all.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  },

  // ─── Mutations ─────────────────────────────────────────
  async create(data: Partial<Prompt> & { title: string; slug: string; prompt: string }): Promise<Prompt> {
    const ob = getOnyxBase();
    const id = data.id || `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const record: Prompt = {
      id,
      slug: data.slug,
      title: data.title,
      description: data.description || "",
      prompt: data.prompt,
      imageUrl: data.imageUrl ?? null,
      imageAlt: data.imageAlt ?? null,
      categoryId: data.categoryId || "cat_general",
      authorName: data.authorName || "Admin",
      tags: data.tags || [],
      featured: !!data.featured,
      published: data.published !== false,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      views: 0,
      copies: 0,
      likes: 0,
      saves: 0,
      createdAt: now,
      updatedAt: now,
    };
    await ob.set(COLLECTIONS.prompts, key(id), record);
    return record;
  },

  async update(id: string, patch: Partial<Prompt>): Promise<Prompt | null> {
    const raw = await this._findRaw(id);
    if (!raw) return null;
    const existing = normalize(raw);
    const updated: Prompt = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    // Write back to the SAME key the record was found under (prevents duplicates).
    await getOnyxBase().set(COLLECTIONS.prompts, raw.key, updated);
    return updated;
  },

  async remove(id: string): Promise<void> {
    const ob = getOnyxBase();
    // delete all possible key variants to avoid orphan duplicates
    for (const k of [`prompts:${id}`, key(id), id]) {
      try { await ob.del(COLLECTIONS.prompts, k); } catch { /* ignore */ }
    }
  },

  // ─── Counters ──────────────────────────────────────────
  async incrementView(id: string): Promise<void> {
    const p = await this.getById(id);
    if (!p) return;
    await this.update(id, { views: p.views + 1 });
  },

  async incrementCopy(id: string): Promise<void> {
    const p = await this.getById(id);
    if (!p) return;
    await this.update(id, { copies: p.copies + 1 });
  },

  async adjustLike(id: string, delta: 1 | -1): Promise<Prompt | null> {
    const p = await this.getById(id);
    if (!p) return null;
    return this.update(id, { likes: Math.max(0, p.likes + delta) });
  },

  async adjustSave(id: string, delta: 1 | -1): Promise<Prompt | null> {
    const p = await this.getById(id);
    if (!p) return null;
    return this.update(id, { saves: Math.max(0, p.saves + delta) });
  },
};
