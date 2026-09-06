import { getOnyxBase, COLLECTIONS } from "./client";
import type { Category, Prompt } from "./types";

const KEY_PREFIXES = ["cat:", "category:"];

function key(id: string) {
  return `${KEY_PREFIXES[0]}${id}`;
}

/** Strip any known key prefix to get the bare id. */
function fromId(k: string) {
  for (const p of KEY_PREFIXES) {
    if (k.startsWith(p)) return k.slice(p.length);
  }
  return k;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || `cat-${Date.now().toString(36)}`;
}

/**
 * Normalise a raw stored record into a Category.
 *
 * New schema (recommended): a category record holds a `promptIds` array listing
 * the prompt ids that belong to it. A category's image is the first prompt's
 * image (promptIds[0]). Categories are created/edited by modifying the record
 * (adding prompt ids to the list).
 *
 * Backward compatible: also accepts the old schema (id/name/slug/imageUrl/featured)
 * and the minimal schema (just a name + promptIds).
 */
function normalize(
  rec: { key: string; value: any; updatedAt?: string },
  promptsById?: Map<string, Prompt>
): Category {
  const v = rec.value || {};
  const id = fromId(rec.key);
  const name = v.name || id;
  const slug = v.slug || slugify(name);
  const promptIds: string[] = Array.isArray(v.promptIds) ? v.promptIds : [];

  // Category image = first prompt's image (by promptIds[0]) if available.
  let imageUrl: string | null = v.imageUrl ?? null;
  if (!imageUrl && promptIds.length && promptsById) {
    const first = promptsById.get(promptIds[0]);
    if (first?.imageUrl) imageUrl = first.imageUrl;
  }

  return {
    id,
    name,
    slug,
    description: v.description ?? null,
    imageUrl,
    featured: !!v.featured,
    promptCount: promptIds.length,
    promptIds,
    createdAt: v.createdAt || rec.updatedAt || new Date().toISOString(),
  };
}

export const categoryService = {
  async list(): Promise<Category[]> {
    const ob = getOnyxBase();
    // fetch categories + prompts in parallel so we can resolve category images
    const [catRecs, promptRecs] = await Promise.all([
      ob.listCollection<any>(COLLECTIONS.categories, 100),
      ob.listCollection<Partial<Prompt>>(COLLECTIONS.prompts, 500),
    ]);
    const promptsById = new Map<string, Prompt>();
    // build a quick lookup: try id, slug, and key-stripped id for each prompt
    promptRecs.forEach((r) => {
      const v = r.value as any;
      const id = v.id || r.key.replace(/^(prompt:|prompts:)/, "");
      promptsById.set(id, v as Prompt);
      if (v.slug) promptsById.set(v.slug, v as Prompt);
      promptsById.set(r.key, v as Prompt);
    });
    const cats = catRecs.map((r) => normalize(r, promptsById));
    return cats.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getBySlug(slug: string): Promise<Category | null> {
    const all = await this.list();
    return all.find((c) => c.slug === slug) || null;
  },

  async getById(id: string): Promise<Category | null> {
    const all = await this.list();
    return all.find((c) => c.id === id) || null;
  },

  /** Return the category a prompt belongs to (by promptIds membership). */
  async getCategoryForPrompt(promptId: string): Promise<Category | null> {
    const all = await this.list();
    return (
      all.find((c) => (c.promptIds || []).includes(promptId)) ||
      all.find((c) => (c.promptIds || []).some((pid) => pid === promptId)) ||
      null
    );
  },

  async create(data: Partial<Category> & { name: string }): Promise<Category> {
    const ob = getOnyxBase();
    const slug = data.slug || slugify(data.name);
    const id = data.id || `cat_${slug}`;
    const now = new Date().toISOString();
    const record: Category = {
      id,
      name: data.name,
      slug,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      featured: !!data.featured,
      promptCount: (data.promptIds || []).length,
      promptIds: data.promptIds || [],
      createdAt: now,
    };
    await ob.set(COLLECTIONS.categories, key(id), record);
    return record;
  },

  async update(id: string, patch: Partial<Category>): Promise<Category | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const updated: Category = { ...existing, ...patch, id: existing.id };
    await getOnyxBase().set(COLLECTIONS.categories, key(id), updated);
    return updated;
  },

  async remove(id: string): Promise<void> {
    await getOnyxBase().del(COLLECTIONS.categories, key(id));
  },
};
