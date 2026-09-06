import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/lib/onyxbase/settings";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

/**
 * Verify the admin access key (the secret URL token stored in Onyx Base).
 * The client calls this with ?k=<key>; returns { ok, access: boolean }.
 * Never returns the key itself.
 */
export async function GET(req: NextRequest) {
  try {
    const k = new URL(req.url).searchParams.get("k") || "";
    const config = await settingsService.get();
    // No access key configured → admin panel is unreachable (set one in Onyx Base)
    if (!config.adminAccessKey) {
      return NextResponse.json({ ok: true, access: false, configured: false });
    }
    // constant-time-ish compare
    const a = k.trim();
    const b = config.adminAccessKey;
    const access = a.length === b.length && a === b;
    return NextResponse.json({ ok: true, access, configured: true });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
