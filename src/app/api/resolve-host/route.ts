import { NextRequest, NextResponse } from "next/server";
import { promptService } from "@/lib/onyxbase/prompts";
import { imageService } from "@/lib/onyxbase/images";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

/**
 * Resolve the current host (or ?subdomain= for dev) to a record that has a
 * matching `subdomain` field. Prompts are checked first, then images.
 *
 * Returns { ok: true, type: "prompt"|"image"|null, record? }.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. explicit ?subdomain= query (for local dev / testing)
    let subdomain = new URL(req.url).searchParams.get("subdomain") || "";

    // 2. derive from Host header: "<subdomain>.<domain.com>"
    if (!subdomain) {
      const host = req.headers.get("host") || req.headers.get("x-forwarded-host") || "";
      // strip port
      const hostname = host.split(":")[0].toLowerCase();
      const parts = hostname.split(".");
      // e.g. myart.promptvault.vercel.app → first label
      //      myart.example.com → first label
      // ignore "www" and bare apex
      if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "prompt-vault") {
        // Only treat as subdomain if it's not the apex itself
        subdomain = parts[0];
      }
    }

    if (!subdomain) {
      return NextResponse.json({ ok: true, type: null, subdomain: null });
    }

    // search prompts first, then images
    const prompt = await promptService.getBySubdomain(subdomain);
    if (prompt) {
      return NextResponse.json({ ok: true, type: "prompt", subdomain, record: prompt });
    }
    const image = await imageService.findBySubdomain(subdomain);
    if (image) {
      return NextResponse.json({ ok: true, type: "image", subdomain, record: image });
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
