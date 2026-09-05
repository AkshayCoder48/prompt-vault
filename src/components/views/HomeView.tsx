"use client";

import { useEffect, useState } from "react";
import { Search, TrendingUp, ArrowRight, Clock, LayoutGrid, Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { PromptCard, PromptCardSkeleton } from "@/components/PromptCard";
import { AdSlot } from "@/components/AdSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Prompt, Category, SiteConfig } from "@/lib/onyxbase/types";
import { formatCount } from "@/lib/format";

interface HomeData {
  config: SiteConfig | null;
  categories: Category[];
  featured: Prompt[];
  popular: Prompt[];
  latest: Prompt[];
}

export function HomeView() {
  const navigate = useAppStore((s) => s.navigate);
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, promptsRes, catsRes] = await Promise.all([
        api<{ config: SiteConfig }>("/api/settings"),
        api<{ items: Prompt[] }>("/api/prompts?limit=60&sort=newest"),
        api<{ categories: Category[] }>("/api/categories"),
      ]);
      const all = promptsRes.items;
      const config = configRes.config;
      const featured = all.filter((p) => p.featured).slice(0, 3);
      const popular = [...all].sort((a, b) => b.views - a.views).slice(0, 6);
      const latest = [...all].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);
      setData({ config, categories: catsRes.categories, featured, popular, latest });
    } catch (err: any) {
      setError(err.message || "Unable to load prompts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const catMap = new Map<string, Category>((data?.categories || []).map((c) => [c.id, c]));

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-muted/50 to-background">
        <div className="absolute inset-0 -z-10 opacity-40 [background:radial-gradient(60%_50%_at_50%_0%,oklch(0.646_0.222_41.116/0.15),transparent)]" />
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <SparklesIcon />
            {data?.config?.siteName || "PromptVault"} · database-driven prompt library
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {data?.config?.homepageTitle || "Discover prompts that actually work."}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            {data?.config?.homepageDescription ||
              "Browse, copy, and share premium AI prompts for art, writing, coding, marketing and more."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) navigate({ name: "search", q: q.trim() });
            }}
            className="relative w-full max-w-xl"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search prompts, categories, styles…"
              className="h-12 pl-12 text-base shadow-sm"
              aria-label="Search prompts"
            />
            <Button type="submit" className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2">
              Search
            </Button>
          </form>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Popular:</span>
            {data?.popular.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate({ name: "prompt", id: p.slug })}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent"
              >
                {p.title}
              </button>
            )) || null}
          </div>
        </div>
      </section>

      {/* Header ad */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
        <AdSlot placement="header" config={data?.config as any} className="h-16" />
      </div>

      {/* Featured */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <SparklesIcon /> Featured prompts
            </h2>
            <p className="text-sm text-muted-foreground">Hand-picked, high-impact prompts.</p>
          </div>
        </div>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <PromptCardSkeleton key={i} />)}
          </div>
        ) : data?.featured.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.featured.map((p) => (
              <PromptCard key={p.id} prompt={p} category={catMap.get(p.categoryId) || null} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No featured prompts yet.</p>
        )}
      </section>

      {/* Feed ad */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <AdSlot placement="homepage-feed" config={data?.config as any} className="h-20" />
      </div>

      {/* Popular */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <TrendingUp className="h-5 w-5 text-primary" /> Popular prompts
            </h2>
            <p className="text-sm text-muted-foreground">Most viewed this period.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: "trending" })} className="gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <PromptCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data?.popular.map((p) => (
              <PromptCard key={p.id} prompt={p} category={catMap.get(p.categoryId) || null} />
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <LayoutGrid className="h-5 w-5 text-primary" /> Browse categories
              </h2>
              <p className="text-sm text-muted-foreground">Find prompts by domain.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: "categories" })} className="gap-1">
              All categories <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {data?.categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate({ name: "category", slug: c.slug })}
                  className="group flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCount(c.promptCount || 0)} prompts
                  </span>
                  {c.featured && (
                    <span className="mt-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Featured
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Feed ad */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6">
        <AdSlot placement="homepage-feed" config={data?.config as any} className="h-20" />
      </div>

      {/* Latest */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Clock className="h-5 w-5 text-primary" /> Latest prompts
            </h2>
            <p className="text-sm text-muted-foreground">Freshly added to the library.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: "latest" })} className="gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <PromptCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data?.latest.map((p) => (
              <PromptCard key={p.id} prompt={p} category={catMap.get(p.categoryId) || null} />
            ))}
          </div>
        )}
      </section>

      {/* Error state */}
      {error && (
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium text-destructive">Unable to load prompts.</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button onClick={load} variant="outline" className="mt-4">Try again</Button>
          </div>
        </div>
      )}

      {/* Footer ad */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
        <AdSlot placement="footer" config={data?.config as any} className="h-16" />
      </div>
    </div>
  );
}

function SparklesIcon() {
  return <Sparkles className="h-5 w-5 text-primary" />;
}
