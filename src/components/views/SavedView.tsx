"use client";

import { useEffect, useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { PromptCard, PromptCardSkeleton } from "@/components/PromptCard";
import { Button } from "@/components/ui/button";
import type { Prompt, Category } from "@/lib/onyxbase/types";

export function SavedView() {
  const navigate = useAppStore((s) => s.navigate);
  const [items, setItems] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await api<{ items: Prompt[] }>("/api/prompts?limit=60");
      const cats = await api<{ categories: Category[] }>("/api/categories");
      setCategories(cats.categories);
      // saved ids come from the cookie-backed store on the server; for simplicity
      // we filter client-side by localStorage saved ids
      const savedIds: string[] = JSON.parse(localStorage.getItem("pv_saved") || "[]");
      const savedSlugs = new Set(savedIds);
      const saved = all.items.filter((p) => savedSlugs.has(p.id) || savedSlugs.has(p.slug));
      setItems(saved);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Bookmark className="h-6 w-6 text-primary" /> Saved prompts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Prompts you've saved for later.</p>
      </header>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <PromptCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">Failed to load saved prompts.</p>
          <Button onClick={load} variant="outline" className="mt-2">Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Bookmark className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-muted-foreground">No saved prompts yet.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate({ name: "home" })}>
            Browse prompts
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <PromptCard key={p.id} prompt={p} category={catMap.get(p.categoryId) || null} />
          ))}
        </div>
      )}
    </div>
  );
}
