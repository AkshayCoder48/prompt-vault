import { NextRequest, NextResponse } from "next/server";
import { ingestMeigenImage, getMeigenImage } from "@/lib/onyxbase/meigen";
import { verifyAdmin } from "@/lib/admin";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

/** POST { meigenId } → ingest a single existing MeiGen gallery image. */
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const meigenId = String(body.meigenId || "").trim();
    if (!meigenId) {
      return NextResponse.json({ ok: false, error: "meigenId is required." }, { status: 400 });
    }
    const subdomain = body.subdomain ? String(body.subdomain).trim().toLowerCase() : undefined;
    const result = await ingestMeigenImage(meigenId, { subdomain });
    return NextResponse.json(result);
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}

/** GET ?meigenId=... → preview a MeiGen record without ingesting. */
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const meigenId = new URL(req.url).searchParams.get("meigenId");
    if (!meigenId) return NextResponse.json({ ok: false, error: "meigenId required." }, { status: 400 });
    const img = await getMeigenImage(meigenId);
    if (!img) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true, meigen: img });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
