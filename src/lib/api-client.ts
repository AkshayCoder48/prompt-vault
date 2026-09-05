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
