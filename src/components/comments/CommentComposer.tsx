"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { Comment } from "@/lib/onyxbase/types";

interface CommentComposerProps {
  promptId: string;
  parentId?: string | null;
  placeholder?: string;
  onSubmitted?: (comment: Comment) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export function CommentComposer({
  promptId,
  parentId = null,
  placeholder = "Share your thoughts…",
  onSubmitted,
  onCancel,
  compact = false,
}: CommentComposerProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ comment: Comment }>(`/api/prompts/${promptId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, authorName: name, parentId, honey: "" }),
      });
      setContent("");
      onSubmitted?.(res.comment);
      toast.success(parentId ? "Reply posted" : "Comment posted");
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      {!compact && (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional — defaults to Anonymous)"
          className="h-9 max-w-xs"
          maxLength={40}
        />
      )}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        maxLength={1000}
        className="resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{content.length}/1000</span>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={submitting || !content.trim()} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Posting…" : parentId ? "Reply" : "Post comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
