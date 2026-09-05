import { getOnyxBase, COLLECTIONS } from "./client";
import type { Visitor, AnalyticsEvent, AnalyticsEventType } from "./types";

const VISITOR_PREFIX = "visitor:";

export const visitorService = {
  async getOrCreate(visitorId: string): Promise<Visitor> {
    const ob = getOnyxBase();
    const rec = await ob.get<Visitor>(COLLECTIONS.visitors, `${VISITOR_PREFIX}${visitorId}`);
    const now = new Date().toISOString();
    if (rec) {
      const updated = { ...rec.value, lastSeen: now };
      await ob.set(COLLECTIONS.visitors, `${VISITOR_PREFIX}${visitorId}`, updated);
      return updated;
    }
    const visitor: Visitor = { id: visitorId, createdAt: now, lastSeen: now };
    await ob.set(COLLECTIONS.visitors, `${VISITOR_PREFIX}${visitorId}`, visitor);
    return visitor;
  },
};

export const analyticsService = {
  async track(
    type: AnalyticsEventType,
    data: { promptId?: string; visitorId?: string; metadata?: Record<string, unknown> }
  ): Promise<void> {
    const ob = getOnyxBase();
    const id = `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const event: AnalyticsEvent = {
      id,
      type,
      promptId: data.promptId,
      visitorId: data.visitorId,
      metadata: data.metadata,
      createdAt: new Date().toISOString(),
    };
    await ob.set(COLLECTIONS.analytics, `event:${id}`, event);
  },

  async trackSearch(term: string, visitorId?: string): Promise<void> {
    const ob = getOnyxBase();
    const t = term.trim().toLowerCase().slice(0, 100);
    if (!t) return;
    const existing = await ob.get<{ term: string; count: number }>(COLLECTIONS.searchTerms, `term:${t}`);
    if (existing) {
      await ob.set(COLLECTIONS.searchTerms, `term:${t}`, { term: t, count: (existing.value.count || 0) + 1 });
    } else {
      await ob.set(COLLECTIONS.searchTerms, `term:${t}`, { term: t, count: 1 });
    }
    await this.track("search", { visitorId, metadata: { term: t } });
  },

  async list(limit = 2000): Promise<AnalyticsEvent[]> {
    const ob = getOnyxBase();
    const recs = await ob.listCollection<AnalyticsEvent>(COLLECTIONS.analytics, limit);
    return recs.map((r) => r.value).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async getTopSearchTerms(limit = 10): Promise<Array<{ term: string; count: number }>> {
    const ob = getOnyxBase();
    const recs = await ob.listCollection<{ term: string; count: number }>(COLLECTIONS.searchTerms, 200);
    return recs
      .map((r) => r.value)
      .filter((v) => v && v.term)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, limit);
  },

  async getDashboard(): Promise<{
    totalEvents: number;
    totalViews: number;
    totalCopies: number;
    totalLikes: number;
    totalSaves: number;
    totalComments: number;
    totalShares: number;
    totalSearches: number;
    byDay: Array<{ date: string; count: number }>;
    byType: Record<string, number>;
  }> {
    const events = await this.list(5000);
    const byType: Record<string, number> = {};
    const dayMap = new Map<string, number>();
    events.forEach((e) => {
      byType[e.type] = (byType[e.type] || 0) + 1;
      const day = new Date(e.createdAt).toISOString().slice(0, 10);
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });
    const byDay = [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));
    return {
      totalEvents: events.length,
      totalViews: byType["prompt_view"] || 0,
      totalCopies: byType["prompt_copy"] || 0,
      totalLikes: byType["prompt_like"] || 0,
      totalSaves: byType["prompt_save"] || 0,
      totalComments: byType["comment_created"] || 0,
      totalShares: byType["share"] || 0,
      totalSearches: byType["search"] || 0,
      byDay,
      byType,
    };
  },
};
