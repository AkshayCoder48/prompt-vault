/**
 * Onyx Base client — Telegram-backed key-value & file platform.
 * Server-side only. Never expose ONYXBASE_API_KEY to the browser.
 *
 * API summary (verified against https://onyxbase-phi.vercel.app):
 *  POST /v1/set                          { collection?, key, value }              -> { ok, key, value, type, collection }
 *  GET  /v1/get/{key}?collection=NAME                                              -> { ok, value, type, collection, updatedAt }
 *  GET  /v1/list?collection=NAME&prefix=PREFIX                                      -> { ok, keys[], count }
 *  DELETE /v1/delete/{key}?collection=NAME                                          -> { ok, deleted, key, collection }
 *  POST /api/v1/graphql                   { query }                                  -> { ok, data }
 *  POST /api/v1/rpc/{name}                { ... }                                    -> { ok, ... }
 *  GET  /v1/health | /v1/whoami | /v1/stats
 *  POST /api/files (multipart) + POST /api/files/{id}/link (permanent URL)
 *
 * Transient backend failures return HTTP 503 — callers should retry.
 */

const ONYXBASE_URL = process.env.ONYXBASE_URL || "https://onyxbase-phi.vercel.app";
const ONYXBASE_API_KEY = process.env.ONYXBASE_API_KEY || "";

export class OnyxBaseError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "OnyxBaseError";
  }
}

class OnyxBaseClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private headers(json = true): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  /** Fetch wrapper with retry on 503 (transient backend unreachable). */
  private async request(
    path: string,
    init: RequestInit = {},
    retries = 3
  ): Promise<any> {
    let lastErr: unknown;
    const isFormData = init.body instanceof FormData;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          headers: { ...this.headers(!isFormData), ...init.headers },
        });
        const text = await res.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = { ok: false, error: text };
        }
        if (res.status === 503 && attempt < retries) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        if (!res.ok || (json && json.ok === false)) {
          const msg = json?.error || `HTTP ${res.status}`;
          throw new OnyxBaseError(msg, res.status);
        }
        return json;
      } catch (err: any) {
        lastErr = err;
        if (err instanceof OnyxBaseError && err.status === 503 && attempt < retries) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        if (attempt < retries && !(err instanceof OnyxBaseError)) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  // ─── Key-Value ───────────────────────────────────────────
  async set(collection: string, key: string, value: unknown): Promise<void> {
    await this.request("/v1/set", {
      method: "POST",
      body: JSON.stringify({ collection, key, value }),
    });
  }

  async get<T = any>(collection: string, key: string): Promise<{ value: T; updatedAt?: string } | null> {
    try {
      const r = await this.request(`/v1/get/${encodeURIComponent(key)}?collection=${encodeURIComponent(collection)}`);
      return { value: r.value as T, updatedAt: r.updatedAt };
    } catch (err) {
      if (err instanceof OnyxBaseError && /not found/i.test(err.message)) return null;
      throw err;
    }
  }

  async list(collection?: string, prefix?: string): Promise<string[]> {
    const params = new URLSearchParams();
    if (collection) params.set("collection", collection);
    if (prefix) params.set("prefix", prefix);
    const r = await this.request(`/v1/list?${params.toString()}`);
    return r.keys || [];
  }

  async del(collection: string, key: string): Promise<void> {
    await this.request(`/v1/delete/${encodeURIComponent(key)}?collection=${encodeURIComponent(collection)}`, {
      method: "DELETE",
    });
  }

  /** Fetch an entire collection in one GraphQL round-trip. */
  async listCollection<T = any>(collection: string, limit = 500): Promise<Array<{ key: string; value: T; updatedAt?: string }>> {
    const query = `{ records(collection: "${collection}", limit: ${limit}) { key value updatedAt } }`;
    const r = await this.request("/api/v1/graphql", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    const recs = r?.data?.records || [];
    return recs.map((rec: any) => ({ key: rec.key, value: rec.value as T, updatedAt: rec.updatedAt }));
  }

  // ─── Health ──────────────────────────────────────────────
  async health(): Promise<any> {
    return this.request("/v1/health");
  }

  async whoami(): Promise<any> {
    return this.request("/v1/whoami");
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Singleton
let _client: OnyxBaseClient | null = null;
export function getOnyxBase(): OnyxBaseClient {
  if (!_client) {
    if (!ONYXBASE_API_KEY) throw new Error("ONYXBASE_API_KEY is not set");
    _client = new OnyxBaseClient(ONYXBASE_URL, ONYXBASE_API_KEY);
  }
  return _client;
}

// Collections (namespaces) used across the app
export const COLLECTIONS = {
  prompts: "prompts",
  categories: "categories",
  comments: "comments",
  visitors: "visitors",
  analytics: "analytics",
  config: "config",
  promptLikes: "prompt_likes",
  promptSaves: "prompt_saves",
  searchTerms: "search_terms",
} as const;
