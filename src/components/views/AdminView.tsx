"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Flag,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Tags,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { formatCount, timeAgo, slugify } from "@/lib/format";
import type {
  Category,
  Comment,
  CommentStatus,
  Prompt,
  SiteConfig,
} from "@/lib/onyxbase/types";

/* -------------------------------------------------------------------------- */
/*  adminApi helper — attaches Bearer token + JSON parsing + throws on !ok    */
/* -------------------------------------------------------------------------- */

async function adminApi<T = any>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { ok: false, error: text || `HTTP ${res.status}` };
  }
  if (!res.ok || (json && json.ok === false)) {
    const err = new Error(json?.error || `HTTP ${res.status}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return json as T;
}

const TOKEN_KEY = "pv_admin_token";

/* -------------------------------------------------------------------------- */
/*  Types for forms                                                            */
/* -------------------------------------------------------------------------- */

interface DashboardData {
  totalEvents: number;
  totalViews: number;
  totalCopies: number;
  totalLikes: number;
  totalSaves: number;
  totalComments: number;
  totalShares: number;
  totalSearches: number;
  byDay: Array<{ date: string; count: number }>;
  byType: Record<string, number>;
  topSearches: Array<{ term: string; count: number }>;
}

type PromptForm = {
  title: string;
  slug: string;
  description: string;
  prompt: string;
  imageUrl: string;
  imageAlt: string;
  categoryId: string;
  authorName: string;
  tags: string; // comma-separated
  featured: boolean;
  published: boolean;
  seoTitle: string;
  seoDescription: string;
};

const emptyPromptForm = (categoryId = ""): PromptForm => ({
  title: "",
  slug: "",
  description: "",
  prompt: "",
  imageUrl: "",
  imageAlt: "",
  categoryId,
  authorName: "",
  tags: "",
  featured: false,
  published: true,
  seoTitle: "",
  seoDescription: "",
});

function promptToForm(p: Prompt): PromptForm {
  return {
    title: p.title || "",
    slug: p.slug || "",
    description: p.description || "",
    prompt: p.prompt || "",
    imageUrl: p.imageUrl || "",
    imageAlt: p.imageAlt || "",
    categoryId: p.categoryId || "",
    authorName: p.authorName || "",
    tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
    featured: !!p.featured,
    published: p.published !== false,
    seoTitle: p.seoTitle || "",
    seoDescription: p.seoDescription || "",
  };
}

function formToPromptPayload(f: PromptForm) {
  return {
    title: f.title.trim(),
    slug: f.slug.trim() || slugify(f.title),
    description: f.description.trim(),
    prompt: f.prompt,
    imageUrl: f.imageUrl.trim() || null,
    imageAlt: f.imageAlt.trim() || null,
    categoryId: f.categoryId || null,
    authorName: f.authorName.trim() || "Anonymous",
    tags: f.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    featured: !!f.featured,
    published: f.published !== false,
    seoTitle: f.seoTitle.trim() || null,
    seoDescription: f.seoDescription.trim() || null,
  };
}

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  featured: boolean;
};

const emptyCategoryForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  featured: false,
};

function categoryToForm(c: Category): CategoryForm {
  return {
    name: c.name || "",
    slug: c.slug || "",
    description: c.description || "",
    imageUrl: c.imageUrl || "",
    featured: !!c.featured,
  };
}

function formToCategoryPayload(f: CategoryForm) {
  return {
    name: f.name.trim(),
    slug: f.slug.trim() || slugify(f.name),
    description: f.description.trim() || null,
    imageUrl: f.imageUrl.trim() || null,
    featured: !!f.featured,
  };
}

/* -------------------------------------------------------------------------- */
/*  Shared UI primitives                                                       */
/* -------------------------------------------------------------------------- */

function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <TriangleAlert className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      )}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-10 text-center">
      <Sparkles className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Login screen                                                               */
/* -------------------------------------------------------------------------- */

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Invalid password.");
      }
      try {
        localStorage.setItem(TOKEN_KEY, json.token);
      } catch {
        /* ignore */
      }
      toast.success("Signed in");
      onLogin(json.token);
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Admin sign in</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Enter the admin password to manage prompts, categories, comments, and site settings.
      </p>
      <form onSubmit={submit} className="mt-6 w-full space-y-3">
        <Label htmlFor="pw">Password</Label>
        <Input
          id="pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="admin123"
          autoFocus
          disabled={submitting}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting || !password.trim()}>
          {submitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Sign in
        </Button>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard tab                                                              */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatCount(value)}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function DashboardTab({ token }: { token: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminApi<DashboardData>(token, "/api/analytics/dashboard");
      setData(r);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return <ErrorState message={error || "No data"} onRetry={load} />;
  }

  const maxDay = Math.max(1, ...data.byDay.map((d) => d.count));
  const stats: Array<{ label: string; value: number; icon: React.ComponentType<{ className?: string }> }> = [
    { label: "Total events", value: data.totalEvents, icon: Activity },
    { label: "Views", value: data.totalViews, icon: Eye },
    { label: "Copies", value: data.totalCopies, icon: Copy },
    { label: "Likes", value: data.totalLikes, icon: Heart },
    { label: "Saves", value: data.totalSaves, icon: Save },
    { label: "Comments", value: data.totalComments, icon: MessageSquare },
    { label: "Shares", value: data.totalShares, icon: Share2 },
    { label: "Searches", value: data.totalSearches, icon: Search },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">Activity across the site.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Activity (last 30 days)
            </CardTitle>
            <CardDescription>Daily events across all analytics types.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byDay.length === 0 ? (
              <EmptyState title="No activity yet" hint="Events will appear here as visitors browse." />
            ) : (
              <div className="flex h-48 items-end gap-1">
                {data.byDay.map((d) => {
                  const h = Math.round((d.count / maxDay) * 100);
                  return (
                    <div
                      key={d.date}
                      className="group relative flex flex-1 flex-col items-center justify-end"
                      title={`${d.date}: ${d.count}`}
                    >
                      <div
                        className="w-full rounded-t bg-primary/70 transition-all hover:bg-primary"
                        style={{ height: `${Math.max(2, h)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" /> Top searches
            </CardTitle>
            <CardDescription>Most popular search terms.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topSearches.length === 0 ? (
              <EmptyState title="No searches yet" />
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {data.topSearches.map((s, i) => {
                  const max = data.topSearches[0]?.count || 1;
                  return (
                    <li key={s.term + i} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{s.term}</span>
                        <Badge variant="secondary" className="tabular-nums">
                          {formatCount(s.count)}
                        </Badge>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${Math.max(4, (s.count / max) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Prompts tab                                                                */
/* -------------------------------------------------------------------------- */

function PromptsTab({ token }: { token: string }) {
  const [items, setItems] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [form, setForm] = useState<PromptForm>(emptyPromptForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Prompt | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [promptsRes, catsRes] = await Promise.all([
        adminApi<{ items: Prompt[] }>(token, "/api/admin/prompts"),
        adminApi<{ items: Category[] }>(token, "/api/admin/categories"),
      ]);
      setItems(promptsRes.items || []);
      setCategories(catsRes.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load prompts.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyPromptForm(categories[0]?.id || ""));
    setDialogOpen(true);
  };

  const openEdit = (p: Prompt) => {
    setEditing(p);
    setForm(promptToForm(p));
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.prompt.trim()) {
      toast.error("Title and prompt are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = formToPromptPayload(form);
      if (editing) {
        await adminApi(token, `/api/admin/prompts/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Prompt updated.");
      } else {
        await adminApi(token, "/api/admin/prompts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Prompt created.");
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi(token, `/api/admin/prompts/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Prompt deleted.");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Prompts</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} prompt{items.length === 1 ? "" : "s"} in the library.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> New prompt
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState title="No prompts yet" hint="Click “New prompt” to add your first." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Copies</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Likes</TableHead>
                  <TableHead className="hidden text-center md:table-cell">Featured</TableHead>
                  <TableHead className="hidden text-center md:table-cell">Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => {
                  const cat = catMap.get(p.categoryId);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[260px]">
                        <div className="truncate font-medium">{p.title}</div>
                        <div className="truncate text-xs text-muted-foreground">/{p.slug}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {cat ? (
                          <Badge variant="outline">{cat.name}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCount(p.views)}</TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatCount(p.copies)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatCount(p.likes)}
                      </TableCell>
                      <TableCell className="hidden text-center md:table-cell">
                        {p.featured ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-primary" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-center md:table-cell">
                        {p.published ? (
                          <Badge variant="secondary">live</Badge>
                        ) : (
                          <Badge variant="outline">draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(p)}
                            aria-label="Edit prompt"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(p)}
                            aria-label="Delete prompt"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit prompt" : "New prompt"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the prompt details. Changes are live immediately."
                : "Create a new prompt entry in the library."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="p-title">Title *</Label>
                <Input
                  id="p-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: f.slug || slugify(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-slug">Slug</Label>
                <Input
                  id="p-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="p-prompt">Prompt *</Label>
              <Textarea
                id="p-prompt"
                rows={5}
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="p-author">Author</Label>
                <Input
                  id="p-author"
                  value={form.authorName}
                  onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                  placeholder="Anonymous"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-category">Category</Label>
                <Select
                  value={form.categoryId || "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, categoryId: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger id="p-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="p-img">Image URL</Label>
                <Input
                  id="p-img"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-imgalt">Image alt</Label>
                <Input
                  id="p-imgalt"
                  value={form.imageAlt}
                  onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="p-tags">
                <span className="inline-flex items-center gap-1">
                  <Tags className="h-3.5 w-3.5" /> Tags (comma-separated)
                </span>
              </Label>
              <Input
                id="p-tags"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="writing, marketing, gpt-4"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="p-seotitle">SEO title</Label>
                <Input
                  id="p-seotitle"
                  value={form.seoTitle}
                  onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-seodesc">SEO description</Label>
                <Input
                  id="p-seodesc"
                  value={form.seoDescription}
                  onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.featured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.published}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
                />
                Published
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {editing ? "Save changes" : "Create prompt"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove “{deleteTarget?.title}”. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Spinner className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Categories tab                                                             */
/* -------------------------------------------------------------------------- */

function CategoriesTab({ token }: { token: string }) {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyCategoryForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminApi<{ items: Category[] }>(token, "/api/admin/categories");
      setItems(r.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyCategoryForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm(categoryToForm(c));
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = formToCategoryPayload(form);
      if (editing) {
        await adminApi(token, `/api/admin/categories/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Category updated.");
      } else {
        await adminApi(token, "/api/admin/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Category created.");
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi(token, `/api/admin/categories/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Category deleted.");
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} categor{items.length === 1 ? "y" : "ies"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> New category
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState title="No categories yet" hint="Create your first category." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Slug</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-center">Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    /{c.slug}
                  </TableCell>
                  <TableCell className="hidden max-w-[280px] truncate text-muted-foreground md:table-cell">
                    {c.description || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {c.featured ? (
                      <CheckCircle2 className="mx-auto h-4 w-4 text-primary" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)} aria-label="Edit category">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(c)}
                        aria-label="Delete category"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update category details." : "Add a new category for prompts."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="c-name">Name *</Label>
                <Input
                  id="c-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      slug: f.slug || slugify(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-slug">Slug</Label>
                <Input
                  id="c-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-img">Image URL</Label>
              <Input
                id="c-img"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.featured}
                onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))}
              />
              Featured
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {editing ? "Save changes" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove “{deleteTarget?.name}”. Prompts in this category will keep their category id but
              may display without a label.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Spinner className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Comments tab                                                               */
/* -------------------------------------------------------------------------- */

const STATUS_VARIANT: Record<CommentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  published: "secondary",
  hidden: "default",
  deleted: "outline",
  reported: "destructive",
};

function statusBadge(s: CommentStatus) {
  const label = s === "published" ? "live" : s;
  return <Badge variant={STATUS_VARIANT[s] || "outline"}>{label}</Badge>;
}

function CommentsTab({ token }: { token: string }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | CommentStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminApi<{ items: Comment[] }>(token, "/api/admin/comments");
      setItems(r.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load comments.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (c: Comment, action: "approve" | "hide" | "delete") => {
    setBusyId(c.id);
    try {
      if (action === "delete") {
        await adminApi(token, `/api/admin/comments/${c.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action }),
        });
      } else {
        await adminApi(token, `/api/admin/comments/${c.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action }),
        });
      }
      toast.success(
        action === "approve" ? "Comment approved" : action === "hide" ? "Comment hidden" : "Comment deleted"
      );
      load();
    } catch (err: any) {
      toast.error(err.message || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((c) => c.status === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: items.length };
    items.forEach((c) => {
      m[c.status] = (m[c.status] || 0) + 1;
    });
    return m;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Comments</h2>
          <p className="text-sm text-muted-foreground">Moderate all comments across the library.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "pending", "published", "hidden", "reported", "deleted"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
            className="gap-1.5"
          >
            <span className="capitalize">{s}</span>
            <Badge variant={filter === s ? "secondary" : "outline"} className="tabular-nums">
              {counts[s] || 0}
            </Badge>
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState title="No comments" hint="Nothing to moderate in this view." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead className="min-w-[260px]">Content</TableHead>
                  <TableHead className="hidden md:table-cell">Prompt</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Likes</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((c) => {
                  const reported = c.status === "reported";
                  return (
                    <TableRow
                      key={c.id}
                      className={reported ? "bg-destructive/5" : undefined}
                    >
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2">
                          {reported && <Flag className="h-3.5 w-3.5 text-destructive" />}
                          <span className="font-medium">{c.authorName || "Anonymous"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[420px] align-top">
                        <p className="line-clamp-3 text-sm">{c.content}</p>
                      </TableCell>
                      <TableCell className="hidden align-top text-xs text-muted-foreground md:table-cell">
                        <span className="font-mono">{c.promptId?.slice(0, 10) || "—"}</span>
                      </TableCell>
                      <TableCell className="align-top text-center">{statusBadge(c.status)}</TableCell>
                      <TableCell className="hidden text-right align-top tabular-nums sm:table-cell">
                        {c.likes || 0}
                      </TableCell>
                      <TableCell className="hidden text-right align-top text-xs text-muted-foreground lg:table-cell">
                        {c.createdAt ? timeAgo(c.createdAt) : "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyId === c.id || c.status === "published"}
                            onClick={() => act(c, "approve")}
                            title="Approve"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyId === c.id || c.status === "hidden"}
                            onClick={() => act(c, "hide")}
                            title="Hide"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyId === c.id}
                            onClick={() => act(c, "delete")}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Settings tab                                                               */
/* -------------------------------------------------------------------------- */

function SettingsTab({ token }: { token: string }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminApi<{ config: SiteConfig }>(token, "/api/admin/settings");
      setConfig(r.config);
      setPassword(r.config.adminPassword || "");
    } catch (err: any) {
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const update = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  };

  const updateAd = (key: keyof SiteConfig["adPlacements"], value: boolean) => {
    setConfig((c) => (c ? { ...c, adPlacements: { ...c.adPlacements, [key]: value } } : c));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const payload: Partial<SiteConfig> = {
        siteName: config.siteName,
        siteDescription: config.siteDescription,
        logo: config.logo,
        favicon: config.favicon,
        maintenanceMode: config.maintenanceMode,
        commentsEnabled: config.commentsEnabled,
        adsEnabled: config.adsEnabled,
        homepageTitle: config.homepageTitle,
        homepageDescription: config.homepageDescription,
        featuredPromptIds: config.featuredPromptIds,
        adPlacements: config.adPlacements,
      };
      if (password.trim() && password !== config.adminPassword) {
        payload.adminPassword = password.trim();
      }
      const r = await adminApi<{ config: SiteConfig }>(token, "/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setConfig(r.config);
      toast.success("Settings saved.");
    } catch (err: any) {
      toast.error(err.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  if (error || !config) {
    return <ErrorState message={error || "No config"} onRetry={load} />;
  }

  const adKeys: Array<{ key: keyof SiteConfig["adPlacements"]; label: string }> = [
    { key: "header", label: "Header" },
    { key: "homepageFeed", label: "Homepage feed" },
    { key: "promptInline", label: "Prompt inline" },
    { key: "sidebar", label: "Sidebar" },
    { key: "footer", label: "Footer" },
    { key: "searchResults", label: "Search results" },
  ];

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Site settings</h2>
          <p className="text-sm text-muted-foreground">Manage global configuration for the site.</p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
            <CardDescription>Identity for the site.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="s-name">Site name</Label>
              <Input
                id="s-name"
                value={config.siteName}
                onChange={(e) => update("siteName", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-desc">Site description</Label>
              <Textarea
                id="s-desc"
                rows={2}
                value={config.siteDescription}
                onChange={(e) => update("siteDescription", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-logo">Logo URL</Label>
              <Input
                id="s-logo"
                value={config.logo || ""}
                onChange={(e) => update("logo", e.target.value || null)}
                placeholder="https://… or /logo.svg"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-fav">Favicon URL</Label>
              <Input
                id="s-fav"
                value={config.favicon || ""}
                onChange={(e) => update("favicon", e.target.value || null)}
                placeholder="https://…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Homepage</CardTitle>
            <CardDescription>Headline copy for the landing page.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="s-ht">Homepage title</Label>
              <Input
                id="s-ht"
                value={config.homepageTitle}
                onChange={(e) => update("homepageTitle", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-hd">Homepage description</Label>
              <Textarea
                id="s-hd"
                rows={4}
                value={config.homepageDescription}
                onChange={(e) => update("homepageDescription", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operations</CardTitle>
            <CardDescription>Toggles for site-wide behavior.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span className="text-sm">
                <span className="block font-medium">Maintenance mode</span>
                <span className="block text-xs text-muted-foreground">Block public access.</span>
              </span>
              <Switch
                checked={config.maintenanceMode}
                onCheckedChange={(v) => update("maintenanceMode", v)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span className="text-sm">
                <span className="block font-medium">Comments enabled</span>
                <span className="block text-xs text-muted-foreground">Allow new comments.</span>
              </span>
              <Switch
                checked={config.commentsEnabled}
                onCheckedChange={(v) => update("commentsEnabled", v)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <span className="text-sm">
                <span className="block font-medium">Ads enabled</span>
                <span className="block text-xs text-muted-foreground">Master switch for ads.</span>
              </span>
              <Switch
                checked={config.adsEnabled}
                onCheckedChange={(v) => update("adsEnabled", v)}
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ad placements</CardTitle>
            <CardDescription>Where ads should appear when enabled.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {adKeys.map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <span className="text-sm">{label}</span>
                <Switch
                  checked={!!config.adPlacements?.[key]}
                  onCheckedChange={(v) => updateAd(key, v)}
                />
              </label>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
            <CardDescription>Admin credentials. Leave blank to keep current password.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5 sm:max-w-md">
              <Label htmlFor="s-pw">Admin password</Label>
              <Input
                id="s-pw"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Changes take effect immediately. You may need to sign in again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main AdminView                                                             */
/* -------------------------------------------------------------------------- */

type TabKey = "dashboard" | "prompts" | "categories" | "comments" | "settings";

const NAV_ITEMS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "prompts", label: "Prompts", icon: Sparkles },
  { key: "categories", label: "Categories", icon: Tags },
  { key: "comments", label: "Comments", icon: MessageSquare },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export function AdminView() {
  const [token, setToken] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<TabKey>("dashboard");

  // Bootstrap: restore token from localStorage + verify via GET /api/admin/login
  useEffect(() => {
    let cancelled = false;
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) || "" : "";
    (async () => {
      try {
        const res = await fetch("/api/admin/login", { credentials: "include" });
        const json = await res.json().catch(() => ({ ok: false, authed: false }));
        if (cancelled) return;
        if (json.authed) {
          setAuthed(true);
          setToken(stored || "");
        } else {
          setAuthed(false);
          setToken(null);
          try {
            localStorage.removeItem(TOKEN_KEY);
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!cancelled) {
          setAuthed(false);
          setToken(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = (t: string) => {
    setToken(t);
    setAuthed(true);
  };

  const logout = () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
    setAuthed(false);
    // reload to clear any cached state and the httpOnly cookie session
    if (typeof window !== "undefined") window.location.reload();
  };

  if (booting) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!authed) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Use token (may be empty string if cookie session is the active auth path —
  // adminApi still sends credentials:include so the cookie authenticates).
  const effectiveToken = token || "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" /> Admin dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage prompts, categories, comments, and site settings.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="gap-6">
        {/* Desktop sidebar / mobile horizontal tabs */}
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-56 lg:shrink-0">
            <TabsList className="flex h-auto w-full flex-wrap gap-1 p-1 lg:flex-col">
              {NAV_ITEMS.map((item) => (
                <TabsTrigger
                  key={item.key}
                  value={item.key}
                  className="justify-start gap-2 px-3 py-2 text-sm lg:w-full"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </aside>

          <div className="min-w-0 flex-1">
            <TabsContent value="dashboard" className="mt-0">
              <DashboardTab token={effectiveToken} />
            </TabsContent>
            <TabsContent value="prompts" className="mt-0">
              <PromptsTab token={effectiveToken} />
            </TabsContent>
            <TabsContent value="categories" className="mt-0">
              <CategoriesTab token={effectiveToken} />
            </TabsContent>
            <TabsContent value="comments" className="mt-0">
              <CommentsTab token={effectiveToken} />
            </TabsContent>
            <TabsContent value="settings" className="mt-0">
              <SettingsTab token={effectiveToken} />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export default AdminView;
