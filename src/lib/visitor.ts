import { cookies } from "next/headers";

const COOKIE_NAME = "pv_visitor";
const HEADER = "x-pv-visitor";

/** Resolve the visitor id from cookie or header; generate a new one if absent. */
export async function getVisitorId(): Promise<{ id: string; isNew: boolean }> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (fromCookie) return { id: fromCookie, isNew: false };
  // fallback handled by client; server returns a fresh id
  const id = `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return { id, isNew: true };
}

export const VISITOR_COOKIE = COOKIE_NAME;

export function visitorCookieHeader(id: string, maxAgeDays = 365) {
  return `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=${maxAgeDays * 86400}; SameSite=Lax`;
}
