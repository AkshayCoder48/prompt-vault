"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight,
  Eye,
  Heart,
  Bookmark,
  Share2,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { api, proxiedImage } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromptViewer } from "@/components/PromptViewer";
import { PromptCard } from "@/components/PromptCard";
import { AdSlot } from "@/components/AdSlot";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { formatCount, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import type { Prompt, Category, Comment, SiteConfig } from "@/lib/onyxbase/types";
import { cn } from "@/lib/utils";

interface PromptDetailData {
  prompt: Prompt;
  category: Category | null;
  categories: Category[];
  related: Prompt[];
  comments: Comment[];
  visitorId: string;
  interaction: { liked: boolean; saved: boolean };
}

export function PromptDetailView({ slug }: { slug: string }) {
  const navigate = useAppStore((s) => s.navigate);
  const [data, setData] = useState<PromptDetailData | null>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(0);
  const [saves, setSaves] = useState(0);
  const [copied, setCopied] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, configRes] = await Promise.all([
        api<PromptDetailData>(`/api/prompts/${slug}`),
        api<{ config: SiteConfig }>("/api/settings"),
      ]);
      setData(detailRes);
      setConfig(configRes.config);
      setLiked(detailRes.interaction.liked);
      setSaved(detailRes.interaction.saved);
      setLikes(detailRes.prompt.likes);
      setSaves(detailRes.prompt.saves);
    } catch (err: any) {
      setError(err.message || "Failed to load prompt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
     
  }, [slug]);

  // track view once on load
  useEffect(() => {
    if (data && !viewTracked) {
      setViewTracked(true);
      api(`/api/prompts/${data.prompt.id}/view`, { method: "POST" }).catch(() => {});
    }
  }, [data, viewTracked]);

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.prompt.prompt);
      setCopied(true);
      api(`/api/prompts/${data.prompt.id}/copy`, { method: "POST" }).catch(() => {});
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleLike = async () => {
    if (!data) return;
    try {
      const res = await api<{ liked: boolean; likes: number }>(
        `/api/prompts/${data.prompt.id}/like`,
        { method: "POST" }
      );
      setLiked(res.liked);
      setLikes(res.likes);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSave = async () => {
    if (!data) return;
    try {
      const res = await api<{ saved: boolean; saves: number }>(
        `/api/prompts/${data.prompt.id}/save`,
        { method: "POST" }
      );
      setSaved(res.saved);
      setSaves(res.saves);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleShare = async () => {
    if (!data) return;
    const url = `${window.location.origin}/#/prompt/${data.prompt.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: data.prompt.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
      api("/api/analytics", {
        method: "POST",
        body: JSON.stringify({ type: "share", promptId: data.prompt.id }),
      }).catch(() => {});
    } catch {
      /* user cancelled */
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading prompt…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 text-center">
        <p className="text-lg font-semibold text-destructive">Prompt not found.</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button onClick={load} variant="outline" className="mt-4">Try again</Button>
        <Button variant="ghost" className="mt-4 ml-2" onClick={() => navigate({ name: "home" })}>
          Back home
        </Button>
      </div>
    );
  }

  const { prompt, category, related, comments } = data;
  const catMap = new Map(data.categories.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigate({ name: "home" })} className="hover:text-foreground">Home</button>
        <ChevronRight className="h-3.5 w-3.5" />
        {category && (
          <>
            <button onClick={() => navigate({ name: "category", slug: category.slug })} className="hover:text-foreground">
              {category.name}
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="truncate text-foreground">{prompt.title}</span>
      </nav>

      <button
        onClick={() => navigate({ name: "home" })}
        className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <header className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {category && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 rounded-full text-xs"
              onClick={() => navigate({ name: "category", slug: category.slug })}
            >
              {category.name}
            </Button>
          )}
          {prompt.featured && (
            <Badge className="rounded-full text-[10px]">Featured</Badge>
          )}
          <span className="text-xs text-muted-foreground">by {prompt.authorName} · {timeAgo(prompt.createdAt)}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{prompt.title}</h1>
        <p className="text-base text-muted-foreground">{prompt.description}</p>
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prompt.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => navigate({ name: "search", tag })}
                className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs hover:bg-accent"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Image */}
      {prompt.imageUrl && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <div className="aspect-[16/9] bg-muted">
            { }
            <img
              src={proxiedImage(prompt.imageUrl) || undefined}
              alt={prompt.imageAlt || prompt.title}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Stats + actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" /> {formatCount(prompt.views)}
          </span>
          <span className="flex items-center gap-1">
            <Copy className="h-4 w-4" /> {formatCount(prompt.copies)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4" /> {formatCount(likes)}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="h-4 w-4" /> {formatCount(saves)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopy} size="sm" className="gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy prompt"}
          </Button>
          <Button
            onClick={handleLike}
            size="sm"
            variant={liked ? "default" : "outline"}
            className="gap-1.5"
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            {liked ? "Liked" : "Like"}
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            variant={saved ? "default" : "outline"}
            className="gap-1.5"
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button onClick={handleShare} size="sm" variant="outline" className="gap-1.5">
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      {/* Prompt viewer */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prompt</h2>
        <PromptViewer prompt={prompt.prompt} onCopy={handleCopy} />
      </section>

      {/* Inline ad */}
      <div className="mt-6">
        <AdSlot placement="prompt-inline" config={config as any} className="h-20" />
      </div>

      {/* Details */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Details</h3>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Category</dt><dd>{category?.name || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Author</dt><dd>{prompt.authorName}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Created</dt><dd>{timeAgo(prompt.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Updated</dt><dd>{timeAgo(prompt.updatedAt)}</dd></div>
          </dl>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">Tags</h3>
          {prompt.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {prompt.tags.map((t) => (
                <Badge key={t} variant="secondary" className="font-normal">#{t}</Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No tags.</p>
          )}
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Related prompts</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <PromptCard key={p.id} prompt={p} category={catMap.get(p.categoryId) || null} />
            ))}
          </div>
        </section>
      )}

      {/* Inline ad */}
      <div className="mt-8">
        <AdSlot placement="prompt-inline" config={config as any} className="h-20" />
      </div>

      {/* Comments */}
      <section className="mt-10">
        <CommentsSection
          promptId={prompt.id}
          initialComments={comments}
          commentsEnabled={config?.commentsEnabled !== false}
        />
      </section>
    </div>
  );
}
