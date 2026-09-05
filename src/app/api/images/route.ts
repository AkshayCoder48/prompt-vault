import { NextResponse } from "next/server";
import { imageService } from "@/lib/onyxbase/images";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await imageService.list(200);
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
