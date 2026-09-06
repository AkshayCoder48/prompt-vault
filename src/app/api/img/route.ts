import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side image proxy.
 *
 * Solves two problems:
 *  1. Hotlink protection — MeiGen (and others) return 403 when the Referer
 *     header is a third-party domain. We fetch server-side with NO Referer.
 *  2. CORS — we add `Access-Control-Allow-Origin: *` so the image can be used
 *     in <img>, canvas, etc. from any origin.
 *
 * Usage: /api/img?url=<encoded image URL>
 *
 * The proxy streams the bytes through and passes through the content-type.
 * Responses are cached for 7 days (Cache-Control + CDN) to keep it fast.
 */

const ALLOWED_HOSTS = [
  "images.meigen.ai",
  "onyxbase-phi.vercel.app",
  "onyxbase.vercel.app",
  "lh3.googleusercontent.com",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB cap

export async function GET(req: NextRequest) {
  const rawUrl = new URL(req.url).searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: "url param required" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });
  }

  // Only allow http(s) and (optionally) known hosts to prevent open-proxy abuse.
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ ok: false, error: "protocol not allowed" }, { status: 400 });
  }

  try {
    // Fetch WITHOUT a Referer header (and with a neutral UA) to bypass hotlink protection.
    const upstream = await fetch(target.toString(), {
      headers: {
        // No Referer / Origin → many CDNs that gate on Referer will serve normally.
        "User-Agent":
          "Mozilla/5.0 (compatible; PromptVaultImageProxy/1.0)",
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: `upstream HTTP ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: `not an image (${contentType})` },
        { status: 415 }
      );
    }

    const contentLength = Number(upstream.headers.get("content-length") || 0);
    if (contentLength && contentLength > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: "image too large" },
        { status: 413 }
      );
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length === 0) {
      return NextResponse.json({ ok: false, error: "empty body" }, { status: 502 });
    }

    // Stream back with permissive CORS + long cache.
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "fetch failed" },
      { status: 502 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
