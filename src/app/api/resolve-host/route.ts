import { NextRequest, NextResponse } from "next/server";
import { promptService } from "@/lib/onyxbase/prompts";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

/**
 * Resolve the current host (or ?subdomain= for dev) to a prompt record that has
 * a matching `subdomain` field. Everything lives in the `prompts` collection now.
 *
 * Returns { ok: true, type: "prompt"|null, record? }.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. explicit ?subdomain= query (for local dev / testing)
    let subdomain = new URL(req.url).searchParams.get("subdomain") || "";

    // 2. derive from Host header: "<subdomain>.<domain.com>"
    if (!subdomain) {
      const host = req.headers.get("host") || req.headers.get("x-forwarded-host") || "";
      const hostname = host.split(":")[0].toLowerCase();
      const parts = hostname.split(".");
      // ignore "www", bare apex, and the vercel project slug
      const reserved = new Set(["www", "prompt-vault", "prompt-vault-chi-seven"]);
      if (parts.length >= 2 && !reserved.has(parts[0])) {
        subdomain = parts[0];
      }
    }

    if (!subdomain) {
      return NextResponse.json({ ok: true, type: null, subdomain: null });
    }

    const prompt = await promptService.getBySubdomain(subdomain);
    if (prompt) {
      return NextResponse.json({ ok: true, type: "prompt", subdomain, record: prompt });
    }

    return NextResponse.json({ ok: true, type: null, subdomain });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
