"use client";

import { useState } from "react";
import { Sparkles, Wand2, FileText, Shuffle, Gauge, Tag, Search, Copy, Code2, Languages, Shield, TrendingUp, Loader2, ArrowRight, Check } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tool = "enhance" | "generate" | "explain" | "remix" | "quality" | "auto-meta" | "ai-search" | "convert" | "variables" | "translate" | "moderate";

const TOOLS: Array<{ id: Tool; label: string; icon: any; desc: string; phase: 1 | 2 | 3 }> = [
  { id: "enhance", label: "Enhancer", icon: Wand2, desc: "Rewrite a rough prompt into a clearer version.", phase: 1 },
  { id: "generate", label: "Generator", icon: Sparkles, desc: "Turn an idea into a complete prompt.", phase: 1 },
  { id: "explain", label: "Explainer", icon: FileText, desc: "Explain what each section does.", phase: 1 },
  { id: "remix", label: "Remix", icon: Shuffle, desc: "Generate alternative versions.", phase: 1 },
  { id: "quality", label: "Quality Score", icon: Gauge, desc: "Score clarity, specificity, structure.", phase: 1 },
  { id: "auto-meta", label: "Auto Metadata", icon: Tag, desc: "Generate title, description, tags.", phase: 1 },
  { id: "ai-search", label: "AI Search", icon: Search, desc: "Natural language → keywords.", phase: 2 },
  { id: "convert", label: "Model Converter", icon: Code2, desc: "Rewrite for a different AI model.", phase: 2 },
  { id: "variables", label: "Variables", icon: Wand2, desc: "Templatize reusable parts.", phase: 2 },
  { id: "translate", label: "Translator", icon: Languages, desc: "Translate preserving structure.", phase: 2 },
  { id: "moderate", label: "Moderator", icon: Shield, desc: "Classify content safety.", phase: 3 },
];

export function PromptLabView() {
  const [tool, setTool] = useState<Tool>("enhance");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useAppStore((s) => s.navigate);

  const [extra, setExtra] = useState<{ style?: string; targetModel?: string; targetLanguage?: string; count?: number; kind?: string }>({});

  const run = async () => {
    if (!input.trim() && tool !== "generate") {
      toast.error("Enter some text first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: any = { prompt: input };
      if (tool === "generate") { body.idea = input; body.style = extra.style; }
      if (tool === "remix") body.count = extra.count || 3;
      if (tool === "convert") body.targetModel = extra.targetModel || "general";
      if (tool === "translate") body.targetLanguage = extra.targetLanguage || "English";
      if (tool === "moderate") body.kind = extra.kind || "comment";
      const res = await api<{ ok: boolean; result: any }>(`/api/ai/${tool}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResult(res.result);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.error("Copy failed"); }
  };

  const currentTool = TOOLS.find((t) => t.id === tool)!;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Sparkles className="h-6 w-6 text-primary" /> AI PromptLab
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Text-only AI tools to enhance, generate, analyze, and transform prompts. All output is structured JSON — never free-form.
        </p>
      </header>

      {/* tool picker */}
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTool(t.id); setResult(null); setError(null); }}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
              tool === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
            )}
          >
            <t.icon className={cn("mt-0.5 h-5 w-5 shrink-0", tool === t.id ? "text-primary" : "text-muted-foreground")} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{t.label}</span>
                <Badge variant="outline" className="text-[9px]">P{t.phase}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* input panel */}
        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <currentTool.icon className="h-4 w-4 text-primary" /> {currentTool.label}
          </h2>
          <div className="space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                tool === "generate" ? "Describe your idea… (e.g. 'a prompt for cinematic food photography')" :
                tool === "ai-search" ? "What are you looking for? (e.g. 'prompts for writing viral tweets')" :
                tool === "moderate" ? "Paste the text to moderate…" :
                "Paste your prompt here…"
              }
              rows={8}
              className="resize-none font-mono text-xs"
            />
            {/* extra options per tool */}
            {tool === "generate" && (
              <Input value={extra.style || ""} onChange={(e) => setExtra({ ...extra, style: e.target.value })} placeholder="Preferred style/model (optional)" />
            )}
            {tool === "remix" && (
              <Select value={String(extra.count || 3)} onValueChange={(v) => setExtra({ ...extra, count: Number(v) })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="2">2 variants</SelectItem><SelectItem value="3">3 variants</SelectItem><SelectItem value="5">5 variants</SelectItem></SelectContent>
              </Select>
            )}
            {tool === "convert" && (
              <Select value={extra.targetModel || "general"} onValueChange={(v) => setExtra({ ...extra, targetModel: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chatgpt">ChatGPT / GPT-4</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="midjourney">Midjourney</SelectItem>
                  <SelectItem value="stable-diffusion">Stable Diffusion</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            )}
            {tool === "translate" && (
              <Input value={extra.targetLanguage || ""} onChange={(e) => setExtra({ ...extra, targetLanguage: e.target.value })} placeholder="Target language (e.g. Spanish, Japanese)" />
            )}
            {tool === "moderate" && (
              <Select value={extra.kind || "comment"} onValueChange={(v) => setExtra({ ...extra, kind: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="comment">Comment</SelectItem><SelectItem value="prompt">Prompt</SelectItem></SelectContent>
              </Select>
            )}
            <Button onClick={run} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Running…" : `Run ${currentTool.label}`}
            </Button>
          </div>
        </Card>

        {/* result panel */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Result</h2>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
          ) : result ? (
            <ResultRenderer tool={tool} result={result} onCopy={copy} onNavigate={navigate} />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Run a tool to see structured results.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function CopyBtn({ text, onCopy }: { text: string; onCopy: (s: string) => void }) {
  return (
    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onCopy(text)}><Copy className="h-3.5 w-3.5" /> Copy</Button>
  );
}

function ResultRenderer({ tool, result, onCopy, onNavigate }: { tool: Tool; result: any; onCopy: (s: string) => void; onNavigate: any }) {
  const copy = (text: string) => <CopyBtn text={text} onCopy={onCopy} />;

  switch (tool) {
    case "enhance":
      return (
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-muted-foreground">Enhanced prompt</div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs">{result.enhanced_prompt}</pre>
            <div className="mt-2 flex justify-end">{copy(result.enhanced_prompt)}</div>
          </div>
          <div className="text-xs"><span className="font-semibold">Before:</span> {result.before_summary}</div>
          <div className="text-xs"><span className="font-semibold">After:</span> {result.after_summary}</div>
          <div>
            <div className="mb-1 text-xs font-semibold">Changes</div>
            <ul className="list-inside list-disc text-xs space-y-1">{(result.changes || []).map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
          </div>
        </div>
      );
    case "generate":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">{(result.tags || []).map((t: string) => <Badge key={t} variant="secondary">#{t}</Badge>)}</div>
          <div><div className="text-xs font-semibold">Title</div><div className="text-sm">{result.title}</div></div>
          <div><div className="text-xs font-semibold">Description</div><div className="text-sm text-muted-foreground">{result.description}</div></div>
          <div>
            <div className="mb-1 text-xs font-semibold">Prompt</div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs">{result.prompt}</pre>
            <div className="mt-2 flex justify-end">{copy(result.prompt)}</div>
          </div>
        </div>
      );
    case "explain":
      return (
        <div className="space-y-3">
          <div className="text-sm">{result.summary}</div>
          <div className="text-xs"><span className="font-semibold">Intent:</span> {result.overall_intent}</div>
          <div>
            <div className="mb-1 text-xs font-semibold">Sections</div>
            <div className="space-y-2">
              {(result.sections || []).map((s: any, i: number) => (
                <div key={i} className="rounded-lg border p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    <Badge variant="outline" className="text-[9px]">{s.effectiveness}</Badge>
                  </div>
                  <div className="text-muted-foreground">{s.purpose}</div>
                </div>
              ))}
            </div>
          </div>
          <div><div className="mb-1 text-xs font-semibold">Tips</div><ul className="list-inside list-disc text-xs space-y-1">{(result.tips || []).map((t: string, i: number) => <li key={i}>{t}</li>)}</ul></div>
        </div>
      );
    case "remix":
      return (
        <div className="space-y-3">
          {(result.variants || []).map((v: any, i: number) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold">{v.label}</span>
                {copy(v.prompt)}
              </div>
              <div className="mb-2 text-[11px] text-muted-foreground">{v.difference}</div>
              <pre className="whitespace-pre-wrap text-xs">{v.prompt}</pre>
            </div>
          ))}
        </div>
      );
    case "quality":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold", result.score >= 80 ? "bg-emerald-500/15 text-emerald-600" : result.score >= 50 ? "bg-amber-500/15 text-amber-600" : "bg-destructive/15 text-destructive")}>{result.score}</div>
            <div className="text-sm text-muted-foreground">overall quality score</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(result.breakdown || {}).map(([k, v]: any) => (
              <div key={k} className="flex items-center justify-between rounded border p-2">
                <span className="capitalize">{k.replace("_", " ")}</span>
                <span className="font-semibold">{v}/100</span>
              </div>
            ))}
          </div>
          {result.issues?.length > 0 && <div><div className="mb-1 text-xs font-semibold text-destructive">Issues</div><ul className="list-inside list-disc text-xs space-y-1">{result.issues.map((i: string, x: number) => <li key={x}>{i}</li>)}</ul></div>}
          {result.suggestions?.length > 0 && <div><div className="mb-1 text-xs font-semibold text-emerald-600">Suggestions</div><ul className="list-inside list-disc text-xs space-y-1">{result.suggestions.map((s: string, x: number) => <li key={x}>{s}</li>)}</ul></div>}
        </div>
      );
    case "auto-meta":
      return (
        <div className="space-y-3">
          <div><div className="text-xs font-semibold">Title</div><div className="text-sm">{result.title}</div></div>
          <div><div className="text-xs font-semibold">Description</div><div className="text-sm text-muted-foreground">{result.description}</div></div>
          <div><div className="mb-1 text-xs font-semibold">Tags</div><div className="flex flex-wrap gap-1">{(result.tags || []).map((t: string) => <Badge key={t} variant="secondary">#{t}</Badge>)}</div></div>
          <div><div className="mb-1 text-xs font-semibold">Use cases</div><ul className="list-inside list-disc text-xs space-y-1">{(result.use_cases || []).map((u: string, i: number) => <li key={i}>{u}</li>)}</ul></div>
        </div>
      );
    case "ai-search":
      return (
        <div className="space-y-3">
          <div className="text-sm">{result.intent}</div>
          <div><div className="mb-1 text-xs font-semibold">Keywords</div><div className="flex flex-wrap gap-1">{(result.keywords || []).map((k: string) => <Badge key={k} variant="secondary">{k}</Badge>)}</div></div>
          {result.tags?.length > 0 && <div><div className="mb-1 text-xs font-semibold">Tags</div><div className="flex flex-wrap gap-1">{result.tags.map((t: string) => <Badge key={t} variant="outline">#{t}</Badge>)}</div></div>}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onNavigate({ name: "search", q: (result.keywords || []).join(" "), sort: result.suggested_sort })}>
            Search with these <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    case "convert":
      return (
        <div className="space-y-3">
          <Badge variant="secondary">→ {result.target_model}</Badge>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs">{result.converted_prompt}</pre>
          <div className="flex justify-end">{copy(result.converted_prompt)}</div>
          <div><div className="mb-1 text-xs font-semibold">Changes</div><ul className="list-inside list-disc text-xs space-y-1">{(result.changes || []).map((c: string, i: number) => <li key={i}>{c}</li>)}</ul></div>
        </div>
      );
    case "variables":
      return (
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold">Templated prompt</div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs">{result.templated_prompt}</pre>
            <div className="mt-2 flex justify-end">{copy(result.templated_prompt)}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold">Variables</div>
            <div className="space-y-2">
              {(result.variables || []).map((v: any, i: number) => (
                <div key={i} className="rounded border p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-amber-400/15 px-1 text-amber-600">{`{{${v.name}}}`}</code>
                    <Badge variant="outline" className="text-[9px]">{v.type}</Badge>
                  </div>
                  <div className="text-muted-foreground">{v.description}</div>
                  {v.default && <div className="text-muted-foreground/70">default: {v.default}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case "translate":
      return (
        <div className="space-y-3">
          <Badge variant="secondary">→ {result.target_language}</Badge>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs">{result.translated_prompt}</pre>
          <div className="flex justify-end">{copy(result.translated_prompt)}</div>
          {result.notes?.length > 0 && <div><div className="mb-1 text-xs font-semibold">Notes</div><ul className="list-inside list-disc text-xs space-y-1">{result.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}</ul></div>}
        </div>
      );
    case "moderate":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={cn("rounded-full px-3 py-1 text-sm font-semibold capitalize", result.classification === "safe" ? "bg-emerald-500/15 text-emerald-600" : result.classification === "abusive" || result.classification === "spam" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600")}>{result.classification.replace("_", " ")}</div>
            <div className="text-sm text-muted-foreground">{result.confidence}% confidence</div>
          </div>
          <Badge variant="outline">Action: {result.recommended_action}</Badge>
          {result.reasons?.length > 0 && <div><div className="mb-1 text-xs font-semibold">Reasons</div><ul className="list-inside list-disc text-xs space-y-1">{result.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>}
        </div>
      );
    default:
      return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>;
  }
}
