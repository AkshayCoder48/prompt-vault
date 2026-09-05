import { NextRequest, NextResponse } from "next/server";
import { commentService } from "@/lib/onyxbase/comments";
import { settingsService } from "@/lib/onyxbase/settings";
import { analyticsService } from "@/lib/onyxbase/analytics";
import { getVisitorId, visitorCookieHeader } from "@/lib/visitor";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sort = (new URL(req.url).searchParams.get("sort") as any) || "newest";
    const comments = await commentService.listByPrompt(id);
    const tree = commentService.sort(commentService.buildTree(comments), sort);
    return NextResponse.json({ ok: true, comments: tree });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load comments.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const config = await settingsService.get();
    if (!config.commentsEnabled) {
      return NextResponse.json({ ok: false, error: "Comments are currently disabled." }, { status: 403 });
    }
    const { id: promptId } = await params;
    const body = await req.json().catch(() => ({}));
    const { id: visitorId } = await getVisitorId();

    // basic anti-spam: cooldown tracked by a last-comment marker key
    if (body?.honey?.length) {
      // honeypot tripped
      return NextResponse.json({ ok: false, error: "Spam detected." }, { status: 400 });
    }

    const comment = await commentService.create({
      promptId,
      parentId: body.parentId || null,
      authorId: visitorId,
      authorName: (body.authorName || "").toString().slice(0, 40),
      content: (body.content || "").toString(),
    });

    await analyticsService.track("comment_created", { promptId, visitorId, metadata: { commentId: comment.id } });

    return NextResponse.json(
      { ok: true, comment },
      { headers: { "set-cookie": visitorCookieHeader(visitorId) } }
    );
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to post comment.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : status === 404 ? 404 : 400 }
    );
  }
}
