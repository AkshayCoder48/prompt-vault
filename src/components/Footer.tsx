"use client";

import { Sparkles, Github, Twitter } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function Footer({ siteName = "PromptVault" }: { siteName?: string }) {
  const navigate = useAppStore((s) => s.navigate);
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="font-bold">{siteName}</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            A dynamic library of high-quality AI prompts. Content is database-driven —
            prompts, categories, and settings update live without redeploying.
          </p>
          <div className="mt-4 flex gap-3">
            <a href="#" className="text-muted-foreground hover:text-foreground" aria-label="GitHub">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground" aria-label="Twitter">
              <Twitter className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><button className="hover:text-foreground" onClick={() => navigate({ name: "trending" })}>Trending</button></li>
            <li><button className="hover:text-foreground" onClick={() => navigate({ name: "latest" })}>Latest</button></li>
            <li><button className="hover:text-foreground" onClick={() => navigate({ name: "categories" })}>Categories</button></li>
            <li><button className="hover:text-foreground" onClick={() => navigate({ name: "saved" })}>Saved</button></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">About</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><button className="hover:text-foreground" onClick={() => navigate({ name: "about" })}>About PromptVault</button></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} {siteName}. Powered by Onyx Base.
      </div>
    </footer>
  );
}
