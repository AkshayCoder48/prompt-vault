import { getOnyxBase, COLLECTIONS } from "./client";
import type { Comment, CommentStatus } from "./types";

const KEY_PREFIX = "comment:";

function key(id: string) {
  return `${KEY_PREFIX}${id}`;
}

function normalize(rec: { key: string; value: Partial<Comment>; updatedAt?: string }): Comment {
  const v = rec.value;
  return {
    id: v.id || rec.key.slice(KEY_PREFIX.length),
    promptId: v.promptId || "",
    parentId: v.parentId ?? null,
    authorId: v.authorId || "anon",
    authorName: v.authorName || "Anonymous",
    content: v.content || "",
    likes: Number(v.likes) || 0,
    status: (v.status as CommentStatus) || "published",
    createdAt: v.createdAt || rec.updatedAt || new Date().toISOString(),
    updatedAt: v.updatedAt || rec.updatedAt || new Date().toISOString(),
  };
}

export type CommentSort = "newest" | "oldest" | "liked" | "discussed";

export const commentService = {
  async listByPrompt(promptId: string): Promise<Comment[]> {
    const ob = getOnyxBase();
    const recs = await ob.listCollection<Partial<Comment>>(COLLECTIONS.comments, 1000);
    return recs
      .map(normalize)
      .filter((c) => c.promptId === promptId && c.status !== "deleted");
  },

  async getById(id: string): Promise<Comment | null> {
    const ob = getOnyxBase();
    const rec = await ob.get<Comment>(COLLECTIONS.comments, key(id));
    if (!rec) return null;
    return normalize({ key: key(id), value: rec.value, updatedAt: rec.updatedAt });
  },

  /** Build a threaded tree from flat comments. */
  buildTree(comments: Comment[]): Comment[] {
    const map = new Map<string, Comment>();
    comments.forEach((c) => map.set(c.id, { ...c, replies: [] }));
    const roots: Comment[] = [];
    map.forEach((c) => {
      if (c.parentId && map.has(c.parentId)) {
        (map.get(c.parentId)!.replies ||= []).push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  },

  sort(comments: Comment[], sort: CommentSort): Comment[] {
    const arr = [...comments];
    switch (sort) {
      case "oldest":
        arr.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        break;
      case "liked":
        arr.sort((a, b) => b.likes - a.likes);
        break;
      case "discussed":
        arr.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0) || b.likes - a.likes);
        break;
      case "newest":
      default:
        arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    // recurse into replies (always newest-first within a thread)
    arr.forEach((c) => {
      if (c.replies && c.replies.length > 1) {
        c.replies.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      }
    });
    return arr;
  },

  MAX_DEPTH: 3,
  MAX_LENGTH: 1000,
  COOLDOWN_MS: 15_000,

  async create(input: {
    promptId: string;
    parentId?: string | null;
    authorId: string;
    authorName: string;
    content: string;
  }): Promise<Comment> {
    const ob = getOnyxBase();
    // validate
    const content = input.content.trim();
    if (!content) throw new Error("Comment cannot be empty.");
    if (content.length > this.MAX_LENGTH)
      throw new Error(`Comment too long (max ${this.MAX_LENGTH} chars).`);
    if (!input.promptId) throw new Error("Prompt is required.");

    // depth check
    if (input.parentId) {
      const parent = await this.getById(input.parentId);
      if (!parent) throw new Error("Parent comment not found.");
      let depth = 1;
      let cur: Comment | null = parent;
      while (cur?.parentId && depth < 10) {
        cur = await this.getById(cur.parentId);
        depth++;
      }
      if (depth >= this.MAX_DEPTH)
        throw new Error("Maximum reply depth reached. Please reply to a top-level comment.");
    }

    const id = `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const comment: Comment = {
      id,
      promptId: input.promptId,
      parentId: input.parentId || null,
      authorId: input.authorId,
      authorName: input.authorName.slice(0, 40) || "Anonymous",
      content,
      likes: 0,
      status: "published",
      createdAt: now,
      updatedAt: now,
    };
    await ob.set(COLLECTIONS.comments, key(id), comment);
    return comment;
  },

  async edit(id: string, visitorId: string, content: string): Promise<Comment | null> {
    const c = await this.getById(id);
    if (!c) return null;
    if (c.authorId !== visitorId) throw new Error("You can only edit your own comments.");
    const trimmed = content.trim();
    if (!trimmed) throw new Error("Comment cannot be empty.");
    if (trimmed.length > this.MAX_LENGTH) throw new Error("Comment too long.");
    return this.update(id, { content: trimmed });
  },

  async update(id: string, patch: Partial<Comment>): Promise<Comment | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const updated: Comment = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    await getOnyxBase().set(COLLECTIONS.comments, key(id), updated);
    return updated;
  },

  async setStatus(id: string, status: CommentStatus): Promise<Comment | null> {
    return this.update(id, { status });
  },

  async remove(id: string, visitorId: string): Promise<void> {
    const c = await this.getById(id);
    if (!c) return;
    if (c.authorId !== visitorId) throw new Error("You can only delete your own comments.");
    // soft delete
    await this.update(id, { status: "deleted", content: "[deleted]" });
  },

  async adminRemove(id: string): Promise<void> {
    await this.update(id, { status: "deleted", content: "[removed by moderator]" });
  },

  async like(id: string, visitorId: string): Promise<Comment | null> {
    const c = await this.getById(id);
    if (!c) return null;
    // store like key to dedupe
    const ob = getOnyxBase();
    const likeKey = `like:${id}:${visitorId}`;
    const existing = await ob.get(COLLECTIONS.comments, likeKey);
    if (existing) return c; // already liked
    await ob.set(COLLECTIONS.comments, likeKey, { at: Date.now() });
    return this.update(id, { likes: c.likes + 1 });
  },

  async report(id: string, reason: string, reporterId: string): Promise<void> {
    const c = await this.getById(id);
    if (!c) return;
    // mark as reported but keep record for moderator review
    await this.update(id, { status: "reported" });
    const ob = getOnyxBase();
    const reportId = `report:${id}:${Date.now().toString(36)}`;
    await ob.set(COLLECTIONS.comments, reportId, {
      commentId: id,
      reason: reason.slice(0, 200),
      reporterId,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  },
};
