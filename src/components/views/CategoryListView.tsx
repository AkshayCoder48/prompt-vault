"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Loader2 } from "lucide-react";
import { api, proxiedImage } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import type { Category } from "@/lib/onyxbase/types";
import { formatCount } from "@/lib/format";

export function CategoryListView() {
  const navigate = useAppStore((s) => s.navigate);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ categories: Category[] }>("/api/categories");
      setCategories(res.categories);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <LayoutGrid className="h-6 w-6 text-primary" /> Categories
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse prompts by domain.</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading categories…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">Failed to load categories.</p>
          <button onClick={load} className="mt-2 text-sm underline">Try again</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ name: "category", slug: c.slug })}
              className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-primary/10">
                {c.imageUrl ? (
                   
                  <img src={proxiedImage(c.imageUrl) || undefined} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                    {c.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{c.name}</h3>
                  {c.featured && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Featured
                    </span>
                  )}
                </div>
                {c.description && <p className="mt-0.5 text-sm text-muted-foreground">{c.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatCount(c.promptCount || 0)} prompts</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
