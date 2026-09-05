"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import type { Comment, CommentStatus } from "@/lib/onyxbase/types";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";
import { toast } from "sonner";

type SortOption = "newest" | "oldest" | "liked" | "discussed";

interface CommentsSectionProps {
  promptId: string;
  initialComments: Comment[];
  commentsEnabled: boolean;
}

export function CommentsSection({ promptId, initialComments, commentsEnabled }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [sort, setSort] = useState<SortOption>("newest");
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = async (newSort?: SortOption) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ comments: Comment[] }>(
        `/api/prompts/${promptId}/comments?sort=${newSort || sort}`
      );
      setComments(res.comments);
    } catch (err: any) {
      setError(err.message);
      if (!err.retryable) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // refetch when sort changes
    refetch(sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const onSortChange = (v: string) => setSort(v as SortOption);

  const handleTopSubmit = (c: Comment) => {
    setComments((prev) => [{ ...c, replies: [] }, ...prev]);
    refetch(sort);
  };

  const handleReplySubmit = (_parentId: string, _c: Comment) => {
    setReplyingTo(null);
    refetch(sort);
  };

  if (!commentsEnabled) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Comments are currently disabled for this site.
      </div>
    );
  }

  const publishedCount = countPublished(comments);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5" />
          Comments ({publishedCount})
        </h3>
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="liked">Most liked</SelectItem>
            <SelectItem value="discussed">Most discussed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Composer */}
      <div className="rounded-lg border border-border bg-card p-4">
        <CommentComposer promptId={promptId} onSubmitted={handleTopSubmit} />
      </div>

      {/* List */}
      {loading && comments.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading comments…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm">
          <p className="text-destructive">Failed to load comments.</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No comments yet. Be the first to share your thoughts.
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              promptId={promptId}
              depth={0}
              maxDepth={3}
              onReply={(id) => setReplyingTo(id)}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              onReplySubmitted={handleReplySubmit}
              onChange={() => refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function countPublished(comments: Comment[]): number {
  let n = 0;
  const walk = (list: Comment[]) => {
    for (const c of list) {
      if (c.status === "published") n++;
      if (c.replies) walk(c.replies);
    }
  };
  walk(comments);
  return n;
}
