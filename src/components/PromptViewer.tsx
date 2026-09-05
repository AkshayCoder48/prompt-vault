"use client";

import { useMemo, useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, Hash, Type, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { charCount, wordCount } from "@/lib/format";
import { toast } from "sonner";

interface PromptViewerProps {
  prompt: string;
  onCopy?: () => void;
}

interface Section {
  title: string;
  body: string;
}

/** Parse a prompt into sections by [SECTION] headers. */
function parseSections(prompt: string): Section[] {
  const lines = prompt.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const m = line.match(/^\s*\[([A-Z][A-Z _-]*[A-Z])\]\s*$/i);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].toUpperCase(), body: "" };
    } else {
      if (!current) current = { title: "CONTENT", body: "" };
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);
  // trim trailing empty
  return sections.map((s) => ({ ...s, body: s.body.trimEnd() }));
}

const SECTION_COLORS: Record<string, string> = {
  SYSTEM: "text-rose-500",
  ROLE: "text-rose-500",
  GOAL: "text-orange-500",
  SUBJECT: "text-amber-500",
  STYLE: "text-emerald-500",
  LIGHTING: "text-cyan-500",
  CAMERA: "text-sky-500",
  BACKGROUND: "text-indigo-500",
  NEGATIVE: "text-red-500",
  RULES: "text-violet-500",
  FORMAT: "text-violet-500",
  OUTPUT: "text-violet-500",
  INPUT: "text-blue-500",
};

export function PromptViewer({ prompt, onCopy }: PromptViewerProps) {
  const sections = useMemo(() => parseSections(prompt), [prompt]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      onCopy?.();
      toast.success("Prompt copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const copySection = async (body: string, title: string) => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success(`Copied ${title} section`);
      onCopy?.();
    } catch {
      toast.error("Failed to copy");
    }
  };

  const toggle = (i: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // detect variables like {{var}} or [VAR]
  const variables = useMemo(() => {
    const found = new Set<string>();
    const re = /\{\{\s*([\w-]+)\s*\}\}/g;
    let m;
    while ((m = re.exec(prompt)) !== null) found.add(m[1]);
    return [...found];
  }, [prompt]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[oklch(0.17_0_0)] text-sm text-zinc-200 shadow-sm dark:bg-black/40">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="flex h-2 w-2 rounded-full bg-rose-400" />
          <span className="flex h-2 w-2 rounded-full bg-amber-400" />
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span className="ml-2 font-mono">prompt.md</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1" title="characters">
            <Type className="h-3 w-3" /> {charCount(prompt).toLocaleString()}
          </span>
          <span className="flex items-center gap-1" title="words">
            <Hash className="h-3 w-3" /> {wordCount(prompt).toLocaleString()}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={copyAll}
            className="h-7 gap-1.5 bg-white/10 text-white hover:bg-white/20"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy all
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="max-h-[28rem] overflow-y-auto p-3 font-mono text-[13px] leading-relaxed">
        {sections.length <= 1 ? (
          <pre className="whitespace-pre-wrap break-words text-zinc-300">{prompt}</pre>
        ) : (
          sections.map((section, i) => {
            const isCollapsed = collapsed.has(i);
            const color = SECTION_COLORS[section.title] || "text-zinc-300";
            return (
              <div key={i} className="mb-2 rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    onClick={() => toggle(i)}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide hover:opacity-80"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                    )}
                    <span className={color}>[{section.title}]</span>
                  </button>
                  <button
                    onClick={() => copySection(section.body, section.title)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-zinc-400 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
                    title={`Copy ${section.title} section`}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {!isCollapsed && (
                  <pre className="whitespace-pre-wrap break-words px-3 pb-3 text-zinc-300/90">
                    {highlightVars(section.body)}
                  </pre>
                )}
              </div>
            );
          })
        )}

        {variables.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3">
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
              <Variable className="h-3 w-3" /> Variables:
            </span>
            {variables.map((v) => (
              <Badge key={v} variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-300">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Highlight {{variables}} inside text. */
function highlightVars(text: string) {
  const parts = text.split(/(\{\{[\s\w-]+\}\})/g);
  return parts.map((part, i) => {
    if (/^\{\{[\s\w-]+\}\}$/.test(part)) {
      return (
        <span key={i} className="rounded bg-amber-400/15 px-1 text-amber-300">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
