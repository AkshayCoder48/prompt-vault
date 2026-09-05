import { NextRequest, NextResponse } from "next/server";
import { ingestMeigenBatch } from "@/lib/onyxbase/meigen";
import { verifyAdmin } from "@/lib/admin";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

/** POST { query, limit } → batch ingest MeiGen search results. */
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query || "").trim();
    const limit = Math.min(Number(body.limit) || 50, 100);
    if (!query) {
      return NextResponse.json({ ok: false, error: "query is required." }, { status: 400 });
    }
    const result = await ingestMeigenBatch(query, limit);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
