import { getOnyxBase, COLLECTIONS } from "./client";
import type { Category } from "./types";
import { promptService } from "./prompts";

const KEY_PREFIX = "cat:";
function key(id: string) {
  return `${KEY_PREFIX}${id}`;
}
function fromId(k: string) {
  return k.startsWith(KEY_PREFIX) ? k.slice(KEY_PREFIX.length) : k;
}

function normalize(rec: { key: string; value: Partial<Category>; updatedAt?: string }): Category {
  const v = rec.value;
  const id = fromId(rec.key);
  return {
    id,
    name: v.name || "Uncategorized",
    slug: v.slug || id,
    description: v.description ?? null,
    imageUrl: v.imageUrl ?? null,
    featured: !!v.featured,
    promptCount: v.promptCount || 0,
    createdAt: v.createdAt || rec.updatedAt || new Date().toISOString(),
  };
}

export const categoryService = {
  async list(): Promise<Category[]> {
    const ob = getOnyxBase();
    const recs = await ob.listCollection<Partial<Category>>(COLLECTIONS.categories, 100);
    let cats = recs.map(normalize);
    // compute live prompt counts from the database
    if (cats.length) {
      const prompts = await promptService.listAll();
      const counts = new Map<string, number>();
      prompts.forEach((p) => counts.set(p.categoryId, (counts.get(p.categoryId) || 0) + 1));
      cats = cats.map((c) => ({ ...c, promptCount: counts.get(c.id) || 0 }));
    }
    return cats.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getBySlug(slug: string): Promise<Category | null> {
    const all = await this.list();
    return all.find((c) => c.slug === slug) || null;
  },

  async getById(id: string): Promise<Category | null> {
    const ob = getOnyxBase();
    const rec = await ob.get<Category>(COLLECTIONS.categories, key(id));
    if (!rec) return null;
    return normalize({ key: key(id), value: rec.value, updatedAt: rec.updatedAt });
  },

  async create(data: Partial<Category> & { name: string; slug: string }): Promise<Category> {
    const ob = getOnyxBase();
    const id = data.id || `cat_${data.slug}`;
    const now = new Date().toISOString();
    const record: Category = {
      id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      featured: !!data.featured,
      promptCount: 0,
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
