"use client";

import { useState, useEffect } from "react";
import { Search, Menu, X, Sparkles, Bookmark, Flame, Clock, LayoutGrid, Info, FlaskConical } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NAV = [
  { name: "lab" as const, label: "PromptLab", icon: FlaskConical },
  { name: "trending" as const, label: "Trending", icon: Flame },
  { name: "latest" as const, label: "Latest", icon: Clock },
  { name: "categories" as const, label: "Categories", icon: LayoutGrid },
  { name: "saved" as const, label: "Saved", icon: Bookmark },
  { name: "about" as const, label: "About", icon: Info },
];

export function Header({ siteName = "PromptVault" }: { siteName?: string }) {
  const navigate = useAppStore((s) => s.navigate);
  const route = useAppStore((s) => s.route);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ name: "search", q: q.trim() });
    setOpen(false);
  };

  const isActive = (name: string) => route.name === name;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md transition-shadow",
        scrolled && "shadow-sm"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => navigate({ name: "home" })}
          className="flex shrink-0 items-center gap-2"
          aria-label="Home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden text-lg font-bold tracking-tight sm:inline">{siteName}</span>
        </button>

        {/* Desktop search */}
        <form onSubmit={submitSearch} className="relative hidden flex-1 max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search prompts, categories, styles…"
            className="h-9 pl-9"
            aria-label="Search prompts"
          />
        </form>

        {/* Desktop nav */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Button
              key={item.name}
              variant={isActive(item.name) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => navigate({ name: item.name })}
              className="gap-1.5"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-3">
            <form onSubmit={submitSearch} className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search prompts…"
                className="h-10 pl-9"
              />
            </form>
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((item) => (
                <Button
                  key={item.name}
                  variant={isActive(item.name) ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    navigate({ name: item.name });
                    setOpen(false);
                  }}
                  className="justify-start gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
