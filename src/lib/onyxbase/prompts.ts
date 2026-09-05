import { getOnyxBase, COLLECTIONS } from "./client";
import type { Prompt, PromptFilters } from "./types";

const KEY_PREFIX = "prompt:";

function key(id: string) {
  return `${KEY_PREFIX}${id}`;
}

function fromId(id: string) {
  return id.startsWith(KEY_PREFIX) ? id.slice(KEY_PREFIX.length) : id;
}

/** Normalise a raw stored record into a Prompt. */
function normalize(rec: { key: string; value: Partial<Prompt>; updatedAt?: string }): Prompt {
  const v = rec.value;
  const id = fromId(rec.key);
  return {
    id,
    slug: v.slug || id,
    title: v.title || "Untitled",
    description: v.description || "",
    prompt: v.prompt || "",
    imageUrl: v.imageUrl ?? null,
    imageAlt: v.imageAlt ?? null,
    categoryId: v.categoryId || "cat_general",
    authorName: v.authorName || "Anonymous",
    tags: Array.isArray(v.tags) ? v.tags : [],
    featured: !!v.featured,
    published: v.published !== false,
    seoTitle: v.seoTitle ?? null,
    seoDescription: v.seoDescription ?? null,
    views: Number(v.views) || 0,
    copies: Number(v.copies) || 0,
    likes: Number(v.likes) || 0,
    saves: Number(v.saves) || 0,
    createdAt: v.createdAt || rec.updatedAt || new Date().toISOString(),
    updatedAt: v.updatedAt || rec.updatedAt || new Date().toISOString(),
  };
}

export const promptService = {
  async getById(id: string): Promise<Prompt | null> {
    const ob = getOnyxBase();
    const rec = await ob.get<Prompt>(COLLECTIONS.prompts, key(id));
    if (!rec) return null;
    return normalize({ key: key(id), value: rec.value, updatedAt: rec.updatedAt });
  },

  async getBySlug(slug: string): Promise<Prompt | null> {
    const all = await this.listAll();
    return all.find((p) => p.slug === slug) || null;
  },

  /** Fetch the whole collection (single GraphQL round-trip). */
  async listAll(): Promise<Prompt[]> {
    const ob = getOnyxBase();
    const recs = await ob.listCollection<Partial<Prompt>>(COLLECTIONS.prompts, 500);
    return recs.map(normalize);
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
      items = items.filter((p) => p.categoryId === filters.category || p.categoryId === `cat_${filters.category}`);
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
        const haystack = [p.title, p.description, p.prompt, p.authorName, p.tags.join(" "), p.categoryId]
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
    const existing = await this.getById(id);
    if (!existing) return null;
    const updated: Prompt = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    await getOnyxBase().set(COLLECTIONS.prompts, key(id), updated);
    return updated;
  },

  async remove(id: string): Promise<void> {
    await getOnyxBase().del(COLLECTIONS.prompts, key(id));
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
