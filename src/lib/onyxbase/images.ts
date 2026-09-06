import { getOnyxBase, COLLECTIONS } from "./client";

/**
 * Canonical image record store in Onyx Base.
 * One record per ingested image, keyed by its image id (e.g. "img_...").
 * The record is the single source of truth — the website URL resolves to it.
 */

export type ImageStatus = "stored" | "failed";
export type PinterestStatus = "pending" | "published" | "failed" | "skipped";

export interface ImageRecord {
  id: string;                  // img_...
  slug: string;
  imageUrl: string;            // canonical Onyx Base file URL
  imageFileId?: string | null; // Onyx Base file id
  websiteUrl: string;          // /#/image/<id>

  title: string;
  description: string;
  hook: string;
  altText: string;
  tags: string[];
  category: string;
  prompt: string;              // original prompt/text

  source: {
    provider: "meigen" | "manual" | "upload";
    imageId: string;
    sourceUrl: string;         // first media_urls entry
    originalPrompt: string;
    authorUsername?: string;
    authorDisplayName?: string;
    model?: string;
    imageWidth?: number;
    imageHeight?: number;
    createdAt?: string;        // original meigen created_at
  };

  pinterest: {
    status: PinterestStatus;
    postId: string | null;
    pinUrl: string | null;
    publishedAt: string | null;
  };

  status: ImageStatus;
  failedStage?: string;
  error?: string;

  /** Optional subdomain slug mapped to this image (e.g. "myart" → myart.domain.com). */
  subdomain?: string | null;

  createdAt: string;
  updatedAt: string;
}

const KEY_PREFIX = "image:";
function key(id: string) {
  return `${KEY_PREFIX}${id}`;
}

export const imageService = {
  COLLECTION: "images",

  async getById(id: string): Promise<ImageRecord | null> {
    const ob = getOnyxBase();
    const rec = await ob.get<ImageRecord>(this.COLLECTION, key(id));
    return rec?.value || null;
  },

  async list(limit = 200): Promise<ImageRecord[]> {
    const ob = getOnyxBase();
    const recs = await ob.listCollection<ImageRecord>(this.COLLECTION, limit);
    return recs
      .map((r) => r.value)
      .filter(Boolean)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  /** Look up an existing record by MeiGen source image id (dedupe). */
  async findByMeigenId(meigenId: string): Promise<ImageRecord | null> {
    const all = await this.list(500);
    return all.find((r) => r.source?.provider === "meigen" && r.source?.imageId === meigenId) || null;
  },

  /** Look up an image record by its subdomain slug. */
  async findBySubdomain(subdomain: string): Promise<ImageRecord | null> {
    const all = await this.list(500);
    const sd = subdomain.toLowerCase().trim();
    return all.find((r) => (r.subdomain || "").toLowerCase() === sd) || null;
  },

  async create(record: ImageRecord): Promise<void> {
    const ob = getOnyxBase();
    await ob.set(this.COLLECTION, key(record.id), record);
  },

  async update(id: string, patch: Partial<ImageRecord>): Promise<ImageRecord | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const updated: ImageRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      source: { ...existing.source, ...(patch.source || {}) },
      pinterest: { ...existing.pinterest, ...(patch.pinterest || {}) },
      updatedAt: new Date().toISOString(),
    };
    await getOnyxBase().set(this.COLLECTION, key(id), updated);
    return updated;
  },

  async remove(id: string): Promise<void> {
    await getOnyxBase().del(this.COLLECTION, key(id));
  },
};

export { COLLECTIONS };
