"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Sparkles, Database, Zap, Shield, Search } from "lucide-react";
import type { SiteConfig } from "@/lib/onyxbase/types";

export function AboutView() {
  const navigate = useAppStore((s) => s.navigate);
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    api<{ config: SiteConfig }>("/api/settings")
      .then((r) => setConfig(r.config))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">About {config?.siteName || "PromptVault"}</h1>
        <p className="mt-3 text-base text-muted-foreground">{config?.siteDescription}</p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <FeatureCard
          icon={<Database className="h-5 w-5" />}
          title="Database-driven"
          desc="Every prompt, category, comment, and setting lives in Onyx Base. Change a record and the site updates on the next fetch — no redeploy."
        />
        <FeatureCard
          icon={<Zap className="h-5 w-5" />}
          title="Low friction"
          desc="Browse, search, copy, and read comments with no signup. A lightweight visitor ID powers likes, saves, and commenting."
        />
        <FeatureCard
          icon={<Shield className="h-5 w-5" />}
          title="Comment moderation"
          desc="Threaded replies, likes, reporting, and moderation states keep conversations healthy."
        />
        <FeatureCard
          icon={<Search className="h-5 w-5" />}
          title="Searchable & SEO-ready"
          desc="Search across titles, descriptions, prompt content, tags, and authors. Shareable filter URLs."
        />
      </div>

      <div className="mt-10 rounded-xl border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          The frontend is a dynamic presentation layer over Onyx Base — a Telegram-backed key-value & file store.
        </p>
        <a
          href="https://onyxbase-phi.vercel.app/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          Learn about Onyx Base →
        </a>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate({ name: "home" })}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back to prompts
        </button>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
