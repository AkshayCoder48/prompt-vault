import { NextRequest, NextResponse } from "next/server";
import { imageService } from "@/lib/onyxbase/images";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await imageService.getById(id);
    if (!record) {
      return NextResponse.json({ ok: false, error: "Image not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message, retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
