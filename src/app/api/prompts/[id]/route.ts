import { NextRequest, NextResponse } from "next/server";
import { promptService } from "@/lib/onyxbase/prompts";
import { categoryService } from "@/lib/onyxbase/categories";
import { commentService } from "@/lib/onyxbase/comments";
import { analyticsService } from "@/lib/onyxbase/analytics";
import { interactionService } from "@/lib/onyxbase/interactions";
import { getVisitorId, visitorCookieHeader } from "@/lib/visitor";
import { OnyxBaseError } from "@/lib/onyxbase/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let prompt = await promptService.getById(id);
    if (!prompt) {
      // try by slug
      prompt = await promptService.getBySlug(id);
    }
    if (!prompt || !prompt.published) {
      return NextResponse.json({ ok: false, error: "Prompt not found." }, { status: 404 });
    }

    const [categories, comments, related, { id: visitorId }] = await Promise.all([
      categoryService.list(),
      commentService.listByPrompt(prompt.id),
      promptService.getRelated(prompt, 4),
      getVisitorId(),
    ]);

    const category = categories.find((c) => c.id === prompt!.categoryId) || null;
    const commentTree = commentService.sort(commentService.buildTree(comments), "newest");

    return NextResponse.json({
      ok: true,
      prompt,
      category,
      categories,
      related,
      comments: commentTree,
      visitorId,
      interaction: {
        liked: await interactionService.isLiked(prompt.id, visitorId),
        saved: await interactionService.isSaved(prompt.id, visitorId),
      },
    }, {
      headers: { "set-cookie": visitorCookieHeader(visitorId) },
    });
  } catch (err: any) {
    const status = err instanceof OnyxBaseError ? err.status || 503 : 500;
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to load prompt.", retryable: status >= 500 },
      { status: status >= 500 ? 503 : 500 }
    );
  }
}
