import { NextResponse } from "next/server";
import { settingsService } from "@/lib/onyxbase/settings";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await settingsService.get();
    // never expose secrets to the browser
    const { adminPassword, adminAccessKey, ...safe } = config as any;
    return NextResponse.json({ ok: true, config: safe });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load settings.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
