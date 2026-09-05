"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Loader2, ArrowLeft, ExternalLink, Tag, User, Calendar, Maximize2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ImageRecord } from "@/lib/onyxbase/images";
import { timeAgo } from "@/lib/format";

export function ImageDetailView({ id }: { id: string }) {
  const navigate = useAppStore((s) => s.navigate);
  const [record, setRecord] = useState<ImageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ record: ImageRecord }>(`/api/images/${id}`);
      setRecord(res.record);
    } catch (err: any) {
      setError(err.message || "Image not found.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
     
  }, [id]);

  const copyPrompt = async () => {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(record.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Prompt copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Loading image…</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <p className="text-lg font-semibold text-destructive">Image not found.</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={load} variant="outline">Try again</Button>
          <Button variant="ghost" onClick={() => navigate({ name: "home" })}>Back home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <button
        onClick={() => navigate({ name: "home" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Image */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            { }
            <img
              src={record.imageUrl}
              alt={record.altText}
              className="h-full w-full object-contain"
            />
          </div>
          <a
            href={record.source.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> Original source (MeiGen)
          </a>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{record.title}</h1>
            <p className="mt-2 text-muted-foreground">{record.hook}</p>
          </div>

          {record.description && <p className="text-sm leading-relaxed">{record.description}</p>}

          {record.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {record.tags.map((t) => (
                <Badge key={t} variant="secondary" className="font-normal">#{t}</Badge>
              ))}
            </div>
          )}

          {/* Prompt */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prompt</h2>
              <Button size="sm" variant="outline" onClick={copyPrompt} className="gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed">
              {record.prompt}
            </pre>
          </div>

          {/* Source attribution */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Source attribution</h3>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1 text-muted-foreground"><User className="h-3 w-3" /> Author</dt>
                <dd className="text-right">{record.source.authorDisplayName || record.source.authorUsername || "Unknown"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" /> Created</dt>
                <dd>{record.source.createdAt ? timeAgo(record.source.createdAt) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="flex items-center gap-1 text-muted-foreground"><Maximize2 className="h-3 w-3" /> Dimensions</dt>
                <dd>{record.source.imageWidth && record.source.imageHeight ? `${record.source.imageWidth} × ${record.source.imageHeight}` : "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Model</dt>
                <dd>{record.source.model || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Category</dt>
                <dd>{record.category}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Provider</dt>
                <dd>MeiGen (existing image)</dd>
              </div>
            </dl>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Image hosted on Onyx Base. Record ID: <code className="rounded bg-muted px-1">{record.id}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
