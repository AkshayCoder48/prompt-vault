import { getOnyxBase } from "./client";
import { imageService, type ImageRecord } from "./images";
import { generateImageMetadata } from "./llm";

const MEIGEN_BASE = process.env.MEIGEN_BASE_URL || "https://www.meigen.ai";

/** Public website URL prefix — single configurable template. */
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
const IMAGE_URL_PREFIX = process.env.PUBLIC_IMAGE_URL_PREFIX || `${PUBLIC_BASE_URL}/#/image/`;

export interface MeigenImage {
  id: string;
  text: string;
  media_urls: string[];
  thumbnail_url?: string;
  image_width?: number;
  image_height?: number;
  model?: string;
  created_at?: string;
  author_username?: string;
  author_display_name?: string;
}

export type IngestStage =
  | "meigen_fetch"
  | "duplicate_check"
  | "image_download"
  | "onyxbase_upload"
  | "metadata_generation"
  | "record_creation";

export interface IngestResult {
  ok: boolean;
  record?: ImageRecord;
  duplicate?: boolean;
  failedStage?: IngestStage;
  error?: string;
}

/** Search MeiGen gallery for existing images. */
export async function searchMeigen(query: string, limit = 50): Promise<MeigenImage[]> {
  const url = `${MEIGEN_BASE}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`MeiGen search HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) return [];
  return json.data as MeigenImage[];
}

/** Fetch a single MeiGen gallery image by id. */
export async function getMeigenImage(imageId: string): Promise<MeigenImage | null> {
  const url = `${MEIGEN_BASE}/api/images/${encodeURIComponent(imageId)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`MeiGen fetch HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success || !json.data) return null;
  return json.data as MeigenImage;
}

interface DownloadedFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  size: number;
}

/** Download + validate an image URL. Throws on non-image or too-large. */
async function downloadImage(url: string): Promise<DownloadedFile> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download HTTP ${res.status} for ${url}`);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Not an image (content-type: ${contentType})`);
  }
  const contentLength = Number(res.headers.get("content-length") || 0);
  // Onyx Base single-shot upload recommends ≤ 8MB; chunked handles bigger.
  if (contentLength > 8 * 1024 * 1024) {
    throw new Error(`Image too large for single-shot upload (${(contentLength / 1024 / 1024).toFixed(1)}MB).`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) throw new Error("Downloaded image is empty.");

  const ext = contentType.split("/")[1]?.split(";")[0] || "png";
  const fileName = `meigen-${Date.now()}.${ext === "jpeg" ? "jpg" : ext}`;
  return { buffer, mimeType: contentType, fileName, size: buffer.length };
}

/** Upload a downloaded image to Onyx Base Files API; returns { fileId, downloadUrl }. */
async function uploadToOnyxBase(file: DownloadedFile, label: string): Promise<{ fileId: string; downloadUrl: string }> {
  const ob = getOnyxBase();
  const base = (process.env.ONYXBASE_URL || "https://onyxbase-phi.vercel.app").replace(/\/$/, "");
  const apiKey = process.env.ONYXBASE_API_KEY || "";
  if (!apiKey) throw new Error("ONYXBASE_API_KEY not set");

  const form = new FormData();
  form.append("file", new Blob([file.buffer], { type: file.mimeType }), file.fileName);
  form.append("label", label);
  form.append("public", "true");

  const res = await fetch(`${base}/api/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Onyx Base upload invalid response: ${text.slice(0, 200)}`);
  }
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Onyx Base upload HTTP ${res.status}`);
  }
  const fileId = json.file?.fileId || json.file?.id;
  if (!fileId) throw new Error("Onyx Base upload returned no file id.");
  // The upload response's downloadUrl may point to a different Onyx Base domain
  // (e.g. onyxbase.vercel.app) that 404s for this account. Rewrite it to the
  // configured base, which serves the /f/{fileId} proxy correctly.
  const downloadUrl = `${base}/f/${fileId}`;
  return { fileId, downloadUrl };
}

function makeId(): string {
  return `img_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `image-${Date.now().toString(36)}`;
}

/**
 * Ingest a single existing MeiGen gallery image into Onyx Base.
 * Does NOT generate any image. Stages are independently retriable.
 */
export async function ingestMeigenImage(
  meigenId: string,
  options: { subdomain?: string } = {}
): Promise<IngestResult> {
  // ── 1. meigen_fetch ─────────────────────────────────────────
  let meigen: MeigenImage;
  try {
    const found = await getMeigenImage(meigenId);
    if (!found) return { ok: false, failedStage: "meigen_fetch", error: "MeiGen image not found." };
    meigen = found;
  } catch (err: any) {
    return { ok: false, failedStage: "meigen_fetch", error: err.message };
  }

  // ── 2. duplicate_check ──────────────────────────────────────
  try {
    const existing = await imageService.findByMeigenId(meigenId);
    if (existing) return { ok: true, duplicate: true, record: existing };
  } catch (err: any) {
    return { ok: false, failedStage: "duplicate_check", error: err.message };
  }

  const sourceUrl = meigen.media_urls?.[0] || meigen.thumbnail_url || "";
  if (!sourceUrl) {
    return { ok: false, failedStage: "image_download", error: "MeiGen record has no image URL." };
  }

  // ── 3. image_download ───────────────────────────────────────
  let downloaded: DownloadedFile;
  try {
    downloaded = await downloadImage(sourceUrl);
  } catch (err: any) {
    return { ok: false, failedStage: "image_download", error: err.message };
  }

  // ── 4. onyxbase_upload ──────────────────────────────────────
  let fileId: string;
  let downloadUrl: string;
  try {
    const up = await uploadToOnyxBase(downloaded, `meigen:${meigenId}`);
    fileId = up.fileId;
    downloadUrl = up.downloadUrl;
  } catch (err: any) {
    return { ok: false, failedStage: "onyxbase_upload", error: err.message };
  }

  // ── 5. metadata_generation ──────────────────────────────────
  let meta;
  try {
    meta = await generateImageMetadata({
      originalPrompt: meigen.text || "",
      authorName: meigen.author_display_name,
      model: meigen.model,
    });
  } catch (err: any) {
    return { ok: false, failedStage: "metadata_generation", error: err.message };
  }

  // ── 6. record_creation ──────────────────────────────────────
  const id = makeId();
  const now = new Date().toISOString();
  const record: ImageRecord = {
    id,
    slug: slugify(meta.title),
    imageUrl: downloadUrl,
    imageFileId: fileId,
    websiteUrl: `${IMAGE_URL_PREFIX}${id}`,
    title: meta.title,
    description: meta.description,
    hook: meta.hook,
    altText: meta.alt_text,
    tags: meta.tags,
    category: meta.category,
    prompt: meigen.text || "",
    source: {
      provider: "meigen",
      imageId: meigen.id,
      sourceUrl,
      originalPrompt: meigen.text || "",
      authorUsername: meigen.author_username,
      authorDisplayName: meigen.author_display_name,
      model: meigen.model,
      imageWidth: meigen.image_width,
      imageHeight: meigen.image_height,
      createdAt: meigen.created_at,
    },
    pinterest: { status: "skipped", postId: null, pinUrl: null, publishedAt: null },
    status: "stored",
    subdomain: options.subdomain || null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await imageService.create(record);
  } catch (err: any) {
    return { ok: false, failedStage: "record_creation", error: err.message };
  }

  return { ok: true, record };
}

/** Batch-ingest: search MeiGen and ingest each result. Returns per-item results. */
export async function ingestMeigenBatch(
  query: string,
  limit = 50
): Promise<{ total: number; ingested: number; duplicates: number; failed: number; results: IngestResult[] }> {
  const items = await searchMeigen(query, limit);
  const results: IngestResult[] = [];
  let ingested = 0;
  let duplicates = 0;
  let failed = 0;

  for (const item of items) {
    const r = await ingestMeigenImage(item.id);
    results.push(r);
    if (r.ok && r.duplicate) duplicates++;
    else if (r.ok) ingested++;
    else failed++;
  }

  return { total: items.length, ingested, duplicates, failed, results };
}
