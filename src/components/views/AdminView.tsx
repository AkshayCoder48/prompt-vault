"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard, FileText, FolderTree, MessageSquare, Settings as SettingsIcon,
  Sparkles, LogOut, Loader2, Plus, Pencil, Trash2, Check, X, Search,
  DownloadCloud, ExternalLink, Image as ImageIcon, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { proxiedImage } from "@/lib/api-client";
import type { Prompt, Category, Comment, SiteConfig } from "@/lib/onyxbase/types";

// ─── Admin API wrapper ──────────────────────────────────────
async function adminApi<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (window as any).__pv_admin_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    credentials: "include",
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { ok: false, error: text }; }
  if (!res.ok || (json && json.ok === false)) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json as T;
}

type TabName = "dashboard" | "prompts" | "categories" | "comments" | "ingest" | "images" | "settings";

export function AdminView() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<TabName>("dashboard");

  useEffect(() => {
    (window as any).__pv_admin_token = localStorage.getItem("pv_admin_token") || "";
    adminApi("/api/admin/login")
      .then((r: any) => setAuthed(!!r.authed))
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  const logout = () => {
    localStorage.removeItem("pv_admin_token");
    (window as any).__pv_admin_token = "";
    setAuthed(false);
    toast.success("Logged out");
  };

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 text-primary" /> Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Manage prompts, categories, comments, ingestion and settings.</p>
        </div>
        <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabName)}>
        <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="prompts" className="gap-1.5"><FileText className="h-4 w-4" /> Prompts</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5"><FolderTree className="h-4 w-4" /> Categories</TabsTrigger>
          <TabsTrigger value="comments" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Comments</TabsTrigger>
          <TabsTrigger value="ingest" className="gap-1.5"><DownloadCloud className="h-4 w-4" /> Ingest MeiGen</TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5"><ImageIcon className="h-4 w-4" /> Images</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><SettingsIcon className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="prompts"><PromptsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="comments"><CommentsTab /></TabsContent>
        <TabsContent value="ingest"><IngestTab onIngested={() => setTab("images")} /></TabsContent>
        <TabsContent value="images"><ImagesTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Login ──────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Invalid password");
      localStorage.setItem("pv_admin_token", json.token);
      (window as any).__pv_admin_token = json.token;
      toast.success("Logged in");
      onLogin();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center px-4">
      <Card className="p-6">
        <div className="mb-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-xl font-bold">Admin login</h1>
          <p className="text-sm text-muted-foreground">Enter your admin password (set in Onyx Base).</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-11"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ─── Dashboard tab ──────────────────────────────────────────
function DashboardTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await adminApi("/api/analytics/dashboard")); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner label="Loading analytics…" />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  const stats = [
    { label: "Total views", value: data.totalViews },
    { label: "Total copies", value: data.totalCopies },
    { label: "Total likes", value: data.totalLikes },
    { label: "Total saves", value: data.totalSaves },
    { label: "Comments", value: data.totalComments },
    { label: "Shares", value: data.totalShares },
    { label: "Searches", value: data.totalSearches },
    { label: "Total events", value: data.totalEvents },
  ];
  const maxDay = Math.max(1, ...(data.byDay || []).map((d: any) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value.toLocaleString()}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Activity (last 30 days)</h3>
        {data.byDay?.length ? (
          <div className="flex h-32 items-end gap-1">
            {data.byDay.map((d: any) => (
              <div
                key={d.date}
                className="flex-1 rounded-t bg-primary/70 transition-all hover:bg-primary"
                style={{ height: `${(d.count / maxDay) * 100}%` }}
                title={`${d.date}: ${d.count}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Top search terms</h3>
        {data.topSearches?.length ? (
          <div className="flex flex-wrap gap-2">
            {data.topSearches.map((t: any) => (
              <Badge key={t.term} variant="secondary" className="gap-1">
                {t.term} <span className="text-muted-foreground">· {t.count}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No searches yet.</p>
        )}
      </Card>
    </div>
  );
}

// ─── Prompts tab ────────────────────────────────────────────
function PromptsTab() {
  const [items, setItems] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [p, c] = await Promise.all([adminApi("/api/admin/prompts"), adminApi("/api/admin/categories")]);
      setItems((p as any).items);
      setCategories((c as any).items);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this prompt?")) return;
    try { await adminApi(`/api/admin/prompts/${id}`, { method: "DELETE" }); toast.success("Deleted"); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <Spinner label="Loading prompts…" />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New prompt</Button>
      </div>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Copies</TableHead>
              <TableHead className="text-center">Featured</TableHead>
              <TableHead className="text-center">Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                <TableCell className="hidden md:table-cell">{categories.find((c) => c.id === p.categoryId)?.name || "—"}</TableCell>
                <TableCell className="text-right">{p.views}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">{p.copies}</TableCell>
                <TableCell className="text-center">{p.featured ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}</TableCell>
                <TableCell className="text-center">{p.published ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {(editing || creating) && (
        <PromptDialog
          prompt={editing}
          categories={categories}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

function PromptDialog({ prompt, categories, onClose, onSaved }: {
  prompt: Prompt | null; categories: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<any>(prompt ? {
    ...prompt, tags: prompt.tags.join(", "),
  } : {
    title: "", slug: "", description: "", prompt: "", imageUrl: "", imageAlt: "",
    categoryId: categories[0]?.id || "", authorName: "Admin", tags: "",
    featured: false, published: true, seoTitle: "", seoDescription: "", subdomain: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
      };
      if (prompt) {
        await adminApi(`/api/admin/prompts/${prompt.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Prompt updated");
      } else {
        await adminApi("/api/admin/prompts", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Prompt created");
      }
      onSaved();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{prompt ? "Edit prompt" : "New prompt"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field>
          <Field label="Prompt content"><Textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={6} className="font-mono text-xs" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Image URL"><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="/seed-img/..." /></Field>
            <Field label="Image alt"><Input value={form.imageAlt} onChange={(e) => setForm({ ...form, imageAlt: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Author"><Input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} /></Field>
          </div>
          <Field label="Tags (comma separated)"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SEO title"><Input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} /></Field>
            <Field label="SEO description"><Input value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} /></Field>
          </div>
          <Field label="Subdomain slug (optional — e.g. 'myart' → myart.yourdomain.com)"><Input value={form.subdomain || ""} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} placeholder="myart" /></Field>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Featured</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /> Published</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.title || !form.slug}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Categories tab ─────────────────────────────────────────
function CategoriesTab() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems((await adminApi("/api/admin/categories") as any).items); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try { await adminApi(`/api/admin/categories/${id}`, { method: "DELETE" }); toast.success("Deleted"); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <Spinner label="Loading categories…" />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New category</Button>
      </div>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Slug</TableHead><TableHead className="text-right">Prompts</TableHead><TableHead className="text-center">Featured</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                <TableCell className="text-right">{c.promptCount}</TableCell>
                <TableCell className="text-center">{c.featured ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground" />}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {(editing || creating) && (
        <CategoryDialog category={editing} onClose={() => { setEditing(null); setCreating(false); }} onSaved={() => { setEditing(null); setCreating(false); load(); }} />
      )}
    </div>
  );
}

function CategoryDialog({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>(category ? { ...category } : { name: "", slug: "", description: "", imageUrl: "", featured: false });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      if (category) { await adminApi(`/api/admin/categories/${category.id}`, { method: "PATCH", body: JSON.stringify(form) }); toast.success("Category updated"); }
      else { await adminApi("/api/admin/categories", { method: "POST", body: JSON.stringify(form) }); toast.success("Category created"); }
      onSaved();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Description"><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field>
          <Field label="Image URL"><Input value={form.imageUrl || ""} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Featured</label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name || !form.slug}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Comments tab ───────────────────────────────────────────
function CommentsTab() {
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems((await adminApi("/api/admin/comments") as any).items); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: string) => {
    try { await adminApi(`/api/admin/comments/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }); toast.success(`Comment ${action}d`); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <Spinner label="Loading comments…" />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  const statusColor: Record<string, string> = { published: "text-emerald-600", reported: "text-amber-600", hidden: "text-muted-foreground", deleted: "text-destructive", pending: "text-blue-600" };

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader><TableRow><TableHead>Author</TableHead><TableHead>Content</TableHead><TableHead className="hidden md:table-cell">Prompt</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No comments yet.</TableCell></TableRow>
          ) : items.map((c) => (
            <TableRow key={c.id} className={c.status === "reported" ? "bg-amber-500/5" : ""}>
              <TableCell className="whitespace-nowrap text-sm">{c.authorName}</TableCell>
              <TableCell className="max-w-[300px] truncate text-sm">{c.content}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{c.promptId}</TableCell>
              <TableCell className="text-center"><span className={cn("text-xs font-medium", statusColor[c.status])}>{c.status}</span></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {c.status !== "published" && <Button size="sm" variant="ghost" className="h-7" onClick={() => act(c.id, "approve")}>Approve</Button>}
                  {c.status !== "hidden" && <Button size="sm" variant="ghost" className="h-7" onClick={() => act(c.id, "hide")}>Hide</Button>}
                  <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => act(c.id, "delete")}>Delete</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ─── Ingest tab (MeiGen) ────────────────────────────────────
function IngestTab({ onIngested }: { onIngested: () => void }) {
  const [meigenId, setMeigenId] = useState("");
  const [ingestSubdomain, setIngestSubdomain] = useState("");
  const [query, setQuery] = useState("Male");
  const [limit, setLimit] = useState("10");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const ingestOne = async () => {
    if (!meigenId.trim()) { toast.error("Enter a MeiGen image id"); return; }
    setBusy(true);
    setLog((l) => [`→ Ingesting ${meigenId}…`, ...l]);
    try {
      const r = await adminApi<any>("/api/admin/ingest", { method: "POST", body: JSON.stringify({ meigenId: meigenId.trim(), subdomain: ingestSubdomain.trim() || undefined }) });
      if (r.ok && r.duplicate) { setLog((l) => [`✓ Duplicate — already ingested: ${r.record?.id}`, ...l]); toast.info("Already ingested (duplicate)"); }
      else if (r.ok) { setLog((l) => [`✓ Ingested: ${r.record.title} → ${r.record.websiteUrl}${r.record.subdomain ? ` (subdomain: ${r.record.subdomain})` : ""}`, ...l]); toast.success("Ingested"); setMeigenId(""); }
      else { setLog((l) => [`✗ Failed at ${r.failedStage}: ${r.error}`, ...l]); toast.error(`Failed: ${r.error}`); }
    } catch (err: any) { setLog((l) => [`✗ ${err.message}`, ...l]); toast.error(err.message); }
    finally { setBusy(false); }
  };

  const ingestBatch = async () => {
    if (!query.trim()) { toast.error("Enter a search query"); return; }
    setBusy(true);
    setLog((l) => [`→ Batch ingesting "${query}" (limit ${limit})…`, ...l]);
    try {
      const r = await adminApi<any>("/api/admin/ingest/batch", { method: "POST", body: JSON.stringify({ query: query.trim(), limit: Number(limit) }) });
      setLog((l) => [`✓ Batch done: ${r.ingested} new, ${r.duplicates} dupes, ${r.failed} failed (of ${r.total})`, ...l]);
      toast.success(`Ingested ${r.ingested} new images`);
      onIngested();
    } catch (err: any) { setLog((l) => [`✗ ${err.message}`, ...l]); toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><DownloadCloud className="h-4 w-4" /> Ingest a single existing MeiGen image</h3>
          <p className="mb-3 text-xs text-muted-foreground">Fetches an existing gallery image, downloads it, uploads to Onyx Base, generates metadata via the LLM, and creates a canonical record. <strong>Does not generate a new image.</strong></p>
          <div className="flex gap-2">
            <Input value={meigenId} onChange={(e) => setMeigenId(e.target.value)} placeholder="e.g. 2009629483448627597" />
            <Button onClick={ingestOne} disabled={busy} className="gap-1.5">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />} Ingest</Button>
          </div>
          <div className="mt-2">
            <Input value={ingestSubdomain} onChange={(e) => setIngestSubdomain(e.target.value)} placeholder="Subdomain slug (optional — e.g. myart)" className="h-9" />
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Search className="h-4 w-4" /> Batch ingest from MeiGen search</h3>
          <p className="mb-3 text-xs text-muted-foreground">Searches MeiGen and ingests each result. Duplicates are auto-skipped via Onyx Base lookup.</p>
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search query (e.g. Male)" />
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} className="w-20" type="number" min={1} max={100} />
            <Button onClick={ingestBatch} disabled={busy} variant="outline" className="gap-1.5">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />} Batch</Button>
          </div>
        </Card>
      </div>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Activity log</h3>
        {log.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet. Ingest an image to begin.</p>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto font-mono text-xs">
            {log.map((line, i) => (
              <div key={i} className={cn(line.startsWith("✗") && "text-destructive", line.startsWith("✓") && "text-emerald-600")}>{line}</div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Images tab ─────────────────────────────────────────────
function ImagesTab() {
  const [items, setItems] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // everything lives in the prompts collection now; show those with an imageUrl
      const json = await adminApi<{ items: Prompt[] }>("/api/admin/prompts");
      setItems((json.items || []).filter((p) => p.imageUrl));
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner label="Loading prompts…" />;
  if (error) return <ErrorBox error={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{items.length} prompt(s) with images in Onyx Base.</p>
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No prompts with images yet. Use the <strong>Ingest MeiGen</strong> tab, or add a record directly in Onyx Base.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="overflow-hidden p-0">
              <div className="bg-muted">
                { }
                <img src={proxiedImage(p.imageUrl) || ""} alt={p.title} className="h-auto w-full max-h-[420px] object-contain" />
              </div>
              <div className="p-3">
                <h4 className="line-clamp-1 text-sm font-semibold">{p.title}</h4>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>)}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>by {p.authorName}</span>
                  <a href={`/#/prompt/${p.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {p.pinterest?.status && (
                  <div className="mt-1 text-[10px] text-muted-foreground">Pinterest: {p.pinterest.status}</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings tab ───────────────────────────────────────────
function SettingsTab() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setConfig((await adminApi("/api/admin/settings") as any).config); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try { await adminApi("/api/admin/settings", { method: "PATCH", body: JSON.stringify(config) }); toast.success("Settings saved"); }
    catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner label="Loading settings…" />;
  if (error || !config) return <ErrorBox error={error || "No config"} onRetry={load} />;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Site</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Site name"><Input value={config.siteName} onChange={(e) => setConfig({ ...config, siteName: e.target.value })} /></Field>
          <Field label="Admin password (empty = login disabled)"><Input value={config.adminPassword} onChange={(e) => setConfig({ ...config, adminPassword: e.target.value })} /></Field>
          <Field label="Admin access key (secret URL key — visit /#/admin?k=<this>)"><Input value={config.adminAccessKey || ""} onChange={(e) => setConfig({ ...config, adminAccessKey: e.target.value })} /></Field>
          <Field label="Site description"><Input value={config.siteDescription} onChange={(e) => setConfig({ ...config, siteDescription: e.target.value })} /></Field>
          <Field label="Logo URL"><Input value={config.logo || ""} onChange={(e) => setConfig({ ...config, logo: e.target.value })} /></Field>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Homepage</h3>
        <div className="grid gap-3">
          <Field label="Homepage title"><Input value={config.homepageTitle} onChange={(e) => setConfig({ ...config, homepageTitle: e.target.value })} /></Field>
          <Field label="Homepage description"><Textarea value={config.homepageDescription} onChange={(e) => setConfig({ ...config, homepageDescription: e.target.value })} rows={2} /></Field>
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Toggles</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Maintenance mode" checked={config.maintenanceMode} onChange={(v) => setConfig({ ...config, maintenanceMode: v })} />
          <Toggle label="Comments enabled" checked={config.commentsEnabled} onChange={(v) => setConfig({ ...config, commentsEnabled: v })} />
          <Toggle label="Ads enabled" checked={config.adsEnabled} onChange={(v) => setConfig({ ...config, adsEnabled: v })} />
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Ad placements</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(config.adPlacements) as Array<keyof SiteConfig["adPlacements"]>).map((k) => (
            <Toggle key={k} label={k} checked={config.adPlacements[k]} onChange={(v) => setConfig({ ...config, adPlacements: { ...config.adPlacements, [k]: v } })} />
          ))}
        </div>
      </Card>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save settings</Button>
      </div>
    </div>
  );
}

// ─── shared bits ────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center justify-between gap-2 text-sm"><span>{label}</span><Switch checked={checked} onCheckedChange={onChange} /></label>;
}
function Spinner({ label }: { label: string }) {
  return <div className="flex items-center gap-2 py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> {label}</div>;
}
function ErrorBox({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="p-6 text-center">
      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-destructive" />
      <p className="text-sm text-destructive">{error}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>
    </Card>
  );
}
