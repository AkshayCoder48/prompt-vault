import { getOnyxBase, COLLECTIONS } from "./client";

/** Lightweight like/save toggle store keyed on (promptId, visitorId). */
function key(promptId: string, visitorId: string) {
  return `${promptId}:${visitorId}`;
}

export const interactionService = {
  async isLiked(promptId: string, visitorId: string): Promise<boolean> {
    const ob = getOnyxBase();
    const r = await ob.get(COLLECTIONS.promptLikes, key(promptId, visitorId));
    return !!r;
  },

  async toggleLike(promptId: string, visitorId: string): Promise<{ liked: boolean }> {
    const ob = getOnyxBase();
    const k = key(promptId, visitorId);
    const existing = await ob.get(COLLECTIONS.promptLikes, k);
    if (existing) {
      await ob.del(COLLECTIONS.promptLikes, k);
      return { liked: false };
    }
    await ob.set(COLLECTIONS.promptLikes, k, { promptId, visitorId, at: Date.now() });
    return { liked: true };
  },

  async isSaved(promptId: string, visitorId: string): Promise<boolean> {
    const ob = getOnyxBase();
    const r = await ob.get(COLLECTIONS.promptSaves, key(promptId, visitorId));
    return !!r;
  },

  async toggleSave(promptId: string, visitorId: string): Promise<{ saved: boolean }> {
    const ob = getOnyxBase();
    const k = key(promptId, visitorId);
    const existing = await ob.get(COLLECTIONS.promptSaves, k);
    if (existing) {
      await ob.del(COLLECTIONS.promptSaves, k);
      return { saved: false };
    }
    await ob.set(COLLECTIONS.promptSaves, k, { promptId, visitorId, at: Date.now() });
    return { saved: true };
  },

  async getSavedIds(visitorId: string): Promise<string[]> {
    const ob = getOnyxBase();
    const recs = await ob.listCollection<{ promptId: string; visitorId: string }>(COLLECTIONS.promptSaves, 1000);
    return recs.filter((r) => r.value.visitorId === visitorId).map((r) => r.value.promptId);
  },
};
