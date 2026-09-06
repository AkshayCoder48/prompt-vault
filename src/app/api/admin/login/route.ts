import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/lib/onyxbase/settings";
import { adminToken, adminCookieHeader, verifyAdmin } from "@/lib/admin";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const config = await settingsService.get();
    // If no password is configured, admin login is disabled entirely.
    if (!config.adminPassword) {
      return NextResponse.json(
        { ok: false, error: "Admin login is not configured. Set adminPassword in Onyx Base." },
        { status: 403 }
      );
    }
    if (body.password !== config.adminPassword) {
      return NextResponse.json({ ok: false, error: "Invalid password." }, { status: 401 });
    }
    const token = adminToken(config.adminPassword);
    return NextResponse.json(
      { ok: true, token },
      { headers: { "set-cookie": adminCookieHeader(token) } }
    );
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Login failed.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, authed: await verifyAdmin(req) });
}
