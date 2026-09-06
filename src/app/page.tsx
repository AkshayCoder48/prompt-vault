"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HomeView } from "@/components/views/HomeView";
import { BrowseView } from "@/components/views/BrowseView";
import { PromptDetailView } from "@/components/views/PromptDetailView";
import { CategoryListView } from "@/components/views/CategoryListView";
import { SavedView } from "@/components/views/SavedView";
import { AboutView } from "@/components/views/AboutView";
import { AdminView } from "@/components/views/AdminView";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteConfig } from "@/lib/onyxbase/types";

export default function Page() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    api<{ config: SiteConfig }>("/api/settings")
      .then((r) => setConfig(r.config))
      .catch(() => {});
  }, [route.name === "home" ? 0 : 1]); // refresh config when navigating home

  // Subdomain resolution: on first load, ask the server which record (if any)
  // maps to the current host's subdomain. If found, auto-navigate to it.
  useEffect(() => {
    // skip if the user is already on a specific content route
    if (window.location.hash && window.location.hash !== "#/" && window.location.hash !== "#") return;
    // forward ?subdomain= (for local dev / testing) — the server also reads the Host header
    const params = new URLSearchParams(window.location.search);
    const sub = params.get("subdomain");
    const url = sub ? `/api/resolve-host?subdomain=${encodeURIComponent(sub)}` : "/api/resolve-host";
    api<{ ok: boolean; type: "prompt" | null; record?: any }>(url)
      .then((r) => {
        if (r.ok && r.type === "prompt" && r.record?.slug) {
          navigate({ name: "prompt", id: r.record.slug });
        }
      })
      .catch(() => {});
    // run once on mount
  }, []);

  // maintenance gate (admin route always accessible)
  if (config?.maintenanceMode && route.name !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Wrench className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold">Under maintenance</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {config.siteName} is temporarily offline for improvements. Please check back soon.
        </p>
        <Button variant="outline" size="sm" onClick={() => (window.location.hash = "/admin")}>
          Admin login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header siteName={config?.siteName} />
      <main className="flex-1">{renderRoute(route)}</main>
      <Footer siteName={config?.siteName} />
    </div>
  );
}

function renderRoute(route: ReturnType<typeof useAppStore.getState>["route"]) {
  switch (route.name) {
    case "home":
      return <HomeView />;
    case "search":
      return (
        <BrowseView
          title={route.q ? `Results for “${route.q}”` : "Search prompts"}
          subtitle="Search across titles, descriptions, prompt content, tags, and authors."
          initialQuery={route.q || ""}
          initialCategory={route.category || ""}
          initialTag={route.tag || ""}
          initialSort={route.sort || "popular"}
        />
      );
    case "prompt":
      return <PromptDetailView slug={route.id} />;
    case "category":
      return (
        <BrowseView
          title={`${capitalize(route.slug.replace(/-/g, " "))}`}
          subtitle="Prompts in this category."
          initialCategory={route.slug}
          showSearch
        />
      );
    case "categories":
      return <CategoryListView />;
    case "trending":
      return (
        <BrowseView
          title="Trending prompts"
          subtitle="What's hot right now — by views, copies, and likes."
          initialSort="trending"
          showSearch={false}
        />
      );
    case "latest":
      return (
        <BrowseView
          title="Latest prompts"
          subtitle="Freshly added to the library."
          initialSort="newest"
          showSearch={false}
        />
      );
    case "saved":
      return <SavedView />;
    case "about":
      return <AboutView />;
    case "admin":
      return <AdminView />;
    default:
      return <HomeView />;
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
