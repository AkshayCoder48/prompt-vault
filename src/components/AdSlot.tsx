"use client";

import { cn } from "@/lib/utils";

interface AdSlotProps {
  placement: "header" | "homepage-feed" | "prompt-inline" | "sidebar" | "footer" | "search-results";
  className?: string;
  config?: { adsEnabled: boolean; adPlacements: Record<string, boolean> } | null;
}

/**
 * Abstract ad slot. Renders a clearly-labelled placeholder that can be swapped
 * for a real ad provider later without touching the UI. Visibility is driven
 * by the database-controlled site config.
 */
export function AdSlot({ placement, className, config }: AdSlotProps) {
  const enabled =
    !config || (config.adsEnabled && config.adPlacements?.[placement] !== false);
  if (!enabled) return null;

  const labelMap: Record<string, string> = {
    header: "Sponsored",
    "homepage-feed": "Advertisement",
    "prompt-inline": "Advertisement",
    sidebar: "Sponsored",
    footer: "Advertisement",
    "search-results": "Advertisement",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground",
        className
      )}
      aria-label="advertisement"
      data-ad-placement={placement}
    >
      <div className="flex flex-col items-center gap-1 py-3 text-center">
        <span className="text-[10px] font-medium">{labelMap[placement]}</span>
        <span className="text-muted-foreground/70 normal-case tracking-normal">
          Ad slot · {placement}
        </span>
      </div>
    </div>
  );
}
