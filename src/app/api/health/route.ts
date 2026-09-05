import { NextResponse } from "next/server";
import { getOnyxBase } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ob = getOnyxBase();
    const [health, whoami] = await Promise.all([ob.health(), ob.whoami()]);
    return NextResponse.json({
      ok: true,
      onyxBase: health,
      authed: !!whoami?.authenticated,
      user: whoami?.user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Onyx Base unreachable.", retryable: true },
      { status: 503 }
    );
  }
}
