"use client";

import { useState } from "react";
import { Heart, Reply, Edit2, Trash2, Flag, Check, X } from "lucide-react";
import type { Comment } from "@/lib/onyxbase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/format";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommentItemProps {
  comment: Comment;
  promptId: string;
  depth: number;
  maxDepth: number;
  onReply: (parentId: string) => void;
  replyingTo: string | null;
  onCancelReply: () => void;
  onReplySubmitted: (parentId: string, comment: Comment) => void;
  onChange: () => void; // refetch
}

export function CommentItem({
  comment,
  promptId,
  depth,
  maxDepth,
  onReply,
  replyingTo,
  onCancelReply,
  onReplySubmitted,
  onChange,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(comment.likes);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const isReplying = replyingTo === comment.id;

  const handleLike = async () => {
    try {
      const res = await api<{ likes: number; liked: boolean }>(`/api/comments/${comment.id}/like`, {
        method: "POST",
      });
      setLikes(res.likes);
      setLiked(res.likes > likes);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = async () => {
    try {
      await api(`/api/comments/${comment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: editText }),
      });
      setEditing(false);
      onChange();
      toast.success("Comment updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this comment? This cannot be undone.")) return;
    try {
      await api(`/api/comments/${comment.id}`, { method: "DELETE" });
      onChange();
      toast.success("Comment deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error("Please enter a reason.");
      return;
    }
    try {
      await api(`/api/comments/${comment.id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: reportReason }),
      });
      setShowReport(false);
      setReportReason("");
      toast.success("Reported. A moderator will review it.");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className={cn("flex gap-3", depth > 0 && "ml-4 border-l border-border pl-4 sm:ml-6 sm:pl-6")}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {comment.authorName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{comment.authorName}</span>
          <span>·</span>
          <span>{timeAgo(comment.createdAt)}</span>
          {comment.status === "reported" && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
              reported
            </span>
          )}
          {comment.status === "hidden" && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">hidden</span>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              maxLength={1000}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEdit} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm">{comment.content}</p>
        )}

        {/* Actions */}
        {!editing && (
          <div className="flex flex-wrap items-center gap-1 pt-1 text-xs">
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-accent",
                liked && "text-rose-500"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
              {likes}
            </button>
            {depth < maxDepth - 1 && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 rounded px-2 py-1 hover:bg-accent"
              >
                <Reply className="h-3.5 w-3.5" /> Reply
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 rounded px-2 py-1 hover:bg-accent"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 rounded px-2 py-1 hover:bg-accent"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              onClick={() => setShowReport((v) => !v)}
              className="flex items-center gap-1 rounded px-2 py-1 hover:bg-accent"
            >
              <Flag className="h-3.5 w-3.5" /> Report
            </button>
          </div>
        )}

        {/* Report box */}
        {showReport && (
          <div className="flex gap-2 pt-1">
            <input
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason (required)"
              className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
              maxLength={200}
            />
            <Button size="sm" variant="outline" onClick={handleReport}>
              Submit
            </Button>
          </div>
        )}

        {/* Reply composer */}
        {isReplying && (
          <div className="pt-2">
            <ReplyComposerInline
              promptId={promptId}
              parentId={comment.id}
              onCancel={onCancelReply}
              onSubmitted={(c) => onReplySubmitted(comment.id, c)}
            />
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 pt-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                promptId={promptId}
                depth={depth + 1}
                maxDepth={maxDepth}
                onReply={onReply}
                replyingTo={replyingTo}
                onCancelReply={onCancelReply}
                onReplySubmitted={onReplySubmitted}
                onChange={onChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline reply composer to avoid circular import issues
import { CommentComposer } from "./CommentComposer";
function ReplyComposerInline({
  promptId,
  parentId,
  onCancel,
  onSubmitted,
}: {
  promptId: string;
  parentId: string;
  onCancel: () => void;
  onSubmitted: (c: Comment) => void;
}) {
  return (
    <CommentComposer
      promptId={promptId}
      parentId={parentId}
      compact
      placeholder="Write a reply…"
      onCancel={onCancel}
      onSubmitted={onSubmitted}
    />
  );
}
