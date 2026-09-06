/** Client-side API helper. All calls are relative (no port) — proxied by Next.js. */
export async function api<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    credentials: "include",
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { ok: false, error: text };
  }
  if (!res.ok || (json && json.ok === false)) {
    const err = new Error(json?.error || `HTTP ${res.status}`) as any;
    err.status = res.status;
    err.retryable = json?.retryable ?? res.status >= 500;
    err.body = json;
    throw err;
  }
  return json as T;
}

export function cn(...args: Array<string | false | undefined | null>) {
  return args.filter(Boolean).join(" ");
}

/**
 * Wrap an external image URL with the server-side image proxy.
 *
 * Why: some image hosts (e.g. MeiGen) have hotlink protection — they return 403
 * when the browser's Referer header is a third-party domain, which breaks <img>
 * tags. The proxy fetches server-side with no Referer and adds permissive CORS
 * headers, so the image renders reliably from any origin.
 *
 * Pass the raw imageUrl through this before putting it into <img src>.
 * `null` / empty → returns null (caller renders a placeholder).
 */
export function proxiedImage(url: string | null | undefined): string | null {
  if (!url) return null;
  // Don't double-proxy, and don't proxy relative/data URLs.
  if (url.startsWith("/api/img?") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  return `/api/img?url=${encodeURIComponent(url)}`;
}

