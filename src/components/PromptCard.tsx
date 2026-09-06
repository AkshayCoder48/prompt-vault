"use client";

import { Eye, Heart, Copy, ArrowUpRight } from "lucide-react";
import type { Prompt, Category } from "@/lib/onyxbase/types";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api, proxiedImage } from "@/lib/api-client";

interface PromptCardProps {
  prompt: Prompt;
  category?: Category | null;
  className?: string;
}

export function PromptCard({ prompt, category, className }: PromptCardProps) {
  const navigate = useAppStore((s) => s.navigate);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      api(`/api/prompts/${prompt.id}/copy`, { method: "POST" }).catch(() => {});
      toast.success("Prompt copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer",
        className
      )}
      onClick={() => navigate({ name: "prompt", id: prompt.slug })}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {prompt.imageUrl ? (
           
          <img
            src={proxiedImage(prompt.imageUrl) || undefined}
            alt={prompt.imageAlt || prompt.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="text-4xl font-bold opacity-20">{prompt.title.charAt(0)}</span>
          </div>
        )}
        {prompt.featured && (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            Featured
          </span>
        )}
        {category && (
          <span className="absolute right-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
            {category.name}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold leading-tight">{prompt.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{prompt.description}</p>

        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {prompt.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {formatCount(prompt.likes)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(prompt.views)}
            </span>
          </div>
          <span className="text-[11px]">by {prompt.authorName}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCopy}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate({ name: "prompt", id: prompt.slug });
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
          >
            Open
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function PromptCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-[16/9] animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-2 flex gap-2">
          <div className="h-8 flex-1 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
