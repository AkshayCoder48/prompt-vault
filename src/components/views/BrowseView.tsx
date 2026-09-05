"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, SlidersHorizontal, Loader2, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { PromptCard, PromptCardSkeleton } from "@/components/PromptCard";
import { AdSlot } from "@/components/AdSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Prompt, Category, SiteConfig } from "@/lib/onyxbase/types";

interface BrowseViewProps {
  title: string;
  subtitle?: string;
  initialQuery?: string;
  initialCategory?: string;
  initialTag?: string;
  initialSort?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  adPlacement?: "search-results" | "homepage-feed";
  emptyMessage?: string;
}

export function BrowseView({
  title,
  subtitle,
  initialQuery = "",
  initialCategory = "",
  initialTag = "",
  initialSort = "newest",
  showSearch = true,
  showFilters = true,
  adPlacement = "search-results",
  emptyMessage = "No prompts found. Try another search or category.",
}: BrowseViewProps) {
  const navigate = useAppStore((s) => s.navigate);
  const [items, setItems] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [tag, setTag] = useState(initialTag);
  const [sort, setSort] = useState(initialSort);
  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  // sync initial values when route changes
  useEffect(() => {
    setQ(initialQuery);
    setCategory(initialCategory);
    setTag(initialTag);
    setSort(initialSort);
    setOffset(0);
  }, [initialQuery, initialCategory, initialTag, initialSort]);

  const load = useCallback(
    async (reset = true) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (category) params.set("category", category);
        if (tag) params.set("tag", tag);
        params.set("sort", sort);
        params.set("limit", String(LIMIT));
        params.set("offset", String(reset ? 0 : offset));
        const res = await api<{ items: Prompt[]; total: number }>(`/api/prompts?${params.toString()}`);
        setItems((prev) => (reset ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setOffset(reset ? LIMIT : offset + LIMIT);
      } catch (err: any) {
        setError(err.message || "Unable to load prompts.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, category, tag, sort, offset]
  );

  // reload on filter change
  useEffect(() => {
    // update URL hash to reflect filters (shareable)
    navigate({
      name: "search",
      q: q || undefined,
      category: category || undefined,
      tag: tag || undefined,
      sort,
    });
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, tag, sort]);

  // load categories + config once
  useEffect(() => {
    Promise.all([
      api<{ categories: Category[] }>("/api/categories"),
      api<{ config: SiteConfig }>("/api/settings"),
    ])
      .then(([c, cfg]) => {
        setCategories(c.categories);
        setConfig(cfg.config);
      })
      .catch(() => {});
  }, []);

  const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const hasMore = items.length < total;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </header>

      {showSearch && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search prompts, tags, authors…"
            className="h-11 pl-9"
          />
        </div>
      )}

      {showFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select value={category} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name} ({c.promptCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Most popular</SelectItem>
              <SelectItem value="copied">Most copied</SelectItem>
              <SelectItem value="liked">Most liked</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
            </SelectContent>
          </Select>
          {tag && (
            <Badge variant="secondary" className="gap-1">
              #{tag}
              <button onClick={() => setTag("")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(q || category || tag) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setCategory("");
                setTag("");
              }}
            >
              Clear all
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{total} result{total !== 1 ? "s" : ""}</span>
        </div>
      )}

      <AdSlot placement={adPlacement} config={config as any} className="mb-6 h-20" />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="font-medium text-destructive">Unable to load prompts.</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => load(true)} variant="outline" className="mt-4">Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
          {(q || category || tag) && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQ("");
                setCategory("");
                setTag("");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <PromptCard key={p.id} prompt={p} category={catMap.get(p.categoryId) || null} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => load(false)} disabled={loadingMore} className="gap-2">
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
