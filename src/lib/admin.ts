import { NextRequest } from "next/server";
import { settingsService } from "@/lib/onyxbase/settings";

const TOKEN_COOKIE = "pv_admin";
const TTL_MS = 1000 * 60 * 60 * 12; // 12h

export async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const config = await settingsService.get();
    // token is adminPassword + a timestamp marker
    if (token === config.adminPassword) return true;
    // also accept a session token: base64(password:ts) within TTL
    try {
      const decoded = Buffer.from(token, "base64").toString();
      const [pwd, ts] = decoded.split(":");
      if (pwd === config.adminPassword && ts && Date.now() - Number(ts) < TTL_MS) return true;
    } catch {
      /* ignore */
    }
  }
  const cookie = req.cookies.get(TOKEN_COOKIE)?.value;
  if (cookie) {
    try {
      const decoded = Buffer.from(cookie, "base64").toString();
      const [pwd, ts] = decoded.split(":");
      const config = await settingsService.get();
      if (pwd === config.adminPassword && ts && Date.now() - Number(ts) < TTL_MS) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export const ADMIN_COOKIE = TOKEN_COOKIE;
export function adminToken(password: string): string {
  return Buffer.from(`${password}:${Date.now()}`).toString("base64");
}
export function adminCookieHeader(token: string): string {
  const maxAge = Math.floor(TTL_MS / 1000);
  return `${ADMIN_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
}
