# Onyx Base Record Format — PromptVault

Onyx Base is the **single source of truth**. You add records directly in Onyx Base
(via the dashboard, CLI, or REST API) and the app fetches them automatically —
**no admin panel needed for content**. This document is the exact contract.

> **Connection**
> - URL: `https://onyxbase-phi.vercel.app`
> - Auth header: `Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883`
> - Each record = one JSON value stored under a `key` inside a `collection`.

---

## How to add a record

### Option A — REST (one call)

```bash
curl -X POST https://onyxbase-phi.vercel.app/v1/set \
  -H "Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "prompts",
    "key": "prompt:my-art-prompt",
    "value": { …see below… }
  }'
```

### Option B — Onyx Base dashboard

Open the Onyx Base app → your account → pick the collection → add a key → paste
the JSON value.

### Option C — `onyx` CLI

```bash
onyx login --server https://onyxbase-phi.vercel.app --key kv_live_530f8a6cbaecd103c0ae05ab3883
onyx set prompts prompt:my-art-prompt --value '{"title":"..."}'
```

---

## Collections & key conventions

| Collection | Key format | Holds |
|---|---|---|
| `prompts` | `prompt:<id>` | one prompt record |
| `images` | `image:<id>` | one canonical image record |
| `categories` | `cat:<id>` | one category |
| `comments` | `comment:<id>` | one comment (created by the app) |
| `config` | `site:config` | the single site-config record |
| `prompt_likes` | `<promptId>:<visitorId>` | like markers (created by the app) |
| `prompt_saves` | `<promptId>:<visitorId>` | save markers (created by the app) |
| `visitors` | `visitor:<id>` | visitor identity (created by the app) |
| `analytics` | `event:<id>` | analytics events (created by the app) |
| `search_terms` | `term:<term>` | search counters (created by the app) |

> You only ever need to create records in **`prompts`**, **`images`**, **`categories`**,
> and **`config`**. The rest are managed by the app.

---

## 1. Prompt record

**Collection:** `prompts`
**Key:** `prompt:<id>`  (e.g. `prompt:cinematic-product-photography`)

```json
{
  "id": "cinematic-product-photography",
  "slug": "cinematic-product-photography",
  "title": "Cinematic Product Photography",
  "description": "Generate premium cinematic product photography with dramatic rim lighting.",
  "prompt": "[SYSTEM]\nYou are a world-class commercial product photographer.\n\n[SUBJECT]\nA single hero product, centered.\n\n[LIGHTING]\nDramatic rim lighting, soft key light from front-left.\n\n[NEGATIVE]\nno text, no watermark",
  "imageUrl": "https://onyxbase-phi.vercel.app/f/f_abc123",
  "imageAlt": "Cinematic product photography of a perfume bottle",
  "categoryId": "cat_photography",
  "authorName": "Your Name",
  "tags": ["photography", "cinematic", "product"],
  "featured": true,
  "published": true,
  "seoTitle": "Cinematic Product Photography Prompt",
  "seoDescription": "AI prompt for premium cinematic product photography.",
  "subdomain": "myart",
  "views": 0,
  "copies": 0,
  "likes": 0,
  "saves": 0,
  "createdAt": "2026-09-05T00:00:00.000Z",
  "updatedAt": "2026-09-05T00:00:00.000Z"
}
```

### Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | must match the part after `prompt:` in the key |
| `slug` | string | yes | URL slug; used in `/#/prompt/<slug>` |
| `title` | string | yes | display title |
| `description` | string | yes | short summary shown on cards |
| `prompt` | string | yes | the full prompt text (supports `[SECTION]` headers for the advanced viewer) |
| `imageUrl` | string\|null | no | canonical image URL (Onyx Base file URL, or any CDN). `null` = no image. |
| `imageAlt` | string\|null | no | alt text for the image |
| `categoryId` | string | yes | must match a `cat:<id>` in the `categories` collection |
| `authorName` | string | no | defaults to `"Anonymous"` |
| `tags` | string[] | no | used for filtering & search |
| `featured` | boolean | no | shows in "Featured" on homepage |
| `published` | boolean | no | `false` hides it from public views (default `true`) |
| `seoTitle` | string\|null | no | custom SEO title |
| `seoDescription` | string\|null | no | custom SEO description |
| **`subdomain`** | string\|null | no | **subdomain slug mapped to this prompt** — see §Subdomain mapping |
| `views`/`copies`/`likes`/`saves` | number | no | counters (managed by app; set `0` on create) |
| `createdAt`/`updatedAt` | ISO string | yes | timestamps |

---

## 2. Image record (canonical)

**Collection:** `images`
**Key:** `image:<id>`  (e.g. `image:img_001`)

You can create these **manually** (point `imageUrl` at any URL) or via the
MeiGen ingestion pipeline (admin → Ingest MeiGen, which uploads to Onyx Base
and fills source attribution automatically).

```json
{
  "id": "img_001",
  "slug": "yellow-fashion-portrait",
  "imageUrl": "https://onyxbase-phi.vercel.app/f/f_abc123",
  "imageFileId": "f_abc123",
  "websiteUrl": "https://yourdomain.com/#/image/img_001",
  "title": "Yellow Fashion Portrait",
  "description": "A bold editorial portrait with warm tones.",
  "hook": "Want to create images like this?",
  "altText": "Fashion portrait with yellow typography",
  "tags": ["fashion", "portrait", "editorial"],
  "category": "Photography",
  "prompt": "Original prompt text that produced the image…",
  "subdomain": "yellowportrait",
  "source": {
    "provider": "manual",
    "imageId": "manual-001",
    "sourceUrl": "https://example.com/original.jpg",
    "originalPrompt": "Original prompt text…",
    "authorUsername": "artist_handle",
    "authorDisplayName": "Artist Name",
    "model": "midjourney",
    "imageWidth": 1344,
    "imageHeight": 768,
    "createdAt": "2026-09-05T00:00:00.000Z"
  },
  "pinterest": {
    "status": "skipped",
    "postId": null,
    "pinUrl": null,
    "publishedAt": null
  },
  "status": "stored",
  "createdAt": "2026-09-05T00:00:00.000Z",
  "updatedAt": "2026-09-05T00:00:00.000Z"
}
```

### Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | matches the part after `image:` in the key |
| `slug` | string | yes | URL slug |
| `imageUrl` | string | yes | canonical image URL (the app displays this) |
| `imageFileId` | string\|null | no | Onyx Base file id (if uploaded via Files API) |
| `websiteUrl` | string | no | public page URL (`/#/image/<id>`) |
| `title` | string | yes | |
| `description` | string | no | |
| `hook` | string | no | short scroll-stopper |
| `altText` | string | no | accessibility alt text |
| `tags` | string[] | no | |
| `category` | string | no | category name (free text) |
| `prompt` | string | no | original prompt |
| **`subdomain`** | string\|null | no | **subdomain slug mapped to this image** |
| `source` | object | no | attribution (see below) |
| `source.provider` | `"meigen"`\|`"manual"`\|`"upload"` | no | |
| `source.imageId` | string | no | id at the source provider |
| `source.sourceUrl` | string | no | original source URL |
| `source.originalPrompt` | string | no | |
| `source.authorUsername` | string | no | |
| `source.authorDisplayName` | string | no | |
| `source.model` | string | no | model used |
| `source.imageWidth`/`imageHeight` | number | no | |
| `source.createdAt` | ISO string | no | original creation date |
| `pinterest` | object | no | publication status (managed by app) |
| `status` | `"stored"`\|`"failed"` | no | |
| `createdAt`/`updatedAt` | ISO string | yes | |

---

## 3. Category record

**Collection:** `categories`
**Key:** `cat:<id>`  (e.g. `cat_photography`)

```json
{
  "id": "cat_photography",
  "name": "Photography",
  "slug": "photography",
  "description": "Camera & rendering styles",
  "imageUrl": null,
  "featured": true,
  "promptCount": 0,
  "createdAt": "2026-09-05T00:00:00.000Z"
}
```

`promptCount` is recomputed live by the app — leave it `0`.

---

## 4. Site config record

**Collection:** `config`
**Key:** `site:config`

There is **one** record. The app creates it on first boot with defaults; edit it
to reconfigure the whole site.

```json
{
  "siteName": "PromptVault",
  "siteDescription": "Discover high-quality AI prompts that actually work.",
  "logo": null,
  "favicon": null,
  "maintenanceMode": false,
  "commentsEnabled": true,
  "adsEnabled": true,
  "homepageTitle": "Discover prompts that actually work.",
  "homepageDescription": "Browse, copy, and share premium AI prompts.",
  "featuredPromptIds": [],
  "adPlacements": {
    "header": true,
    "homepageFeed": true,
    "promptInline": true,
    "sidebar": false,
    "footer": true,
    "searchResults": true
  },
  "adminPassword": "admin123"
}
```

---

## Subdomain mapping

Every **prompt** and **image** record accepts an optional **`subdomain`** field.
When a request arrives on `<subdomain>.<yourdomain.com>`, the app:

1. Reads the `Host` header → extracts the first label (the subdomain).
2. Queries Onyx Base for a prompt with `subdomain` matching that label (case-insensitive).
3. If none, queries image records.
4. If a match is found, the app **auto-navigates** to that record's page
   (`/#/prompt/<slug>` or `/#/image/<id>`).

### Example

Record in `prompts`:
```json
{ "id": "myart", "slug": "my-art", "subdomain": "myart", "title": "My Art", … }
```

Then `myart.yourdomain.com` automatically shows that prompt's detail page.

### Testing locally (no subdomain)

Use the query param: `http://localhost:3000/?subdomain=myart` — the
`/api/resolve-host` endpoint reads it the same way.

### Production subdomain setup

1. Add a **wildcard domain** (`*.yourdomain.com`) to the Vercel project
   (Settings → Domains). Vercel issues a wildcard cert.
2. Point `*.yourdomain.com` DNS to Vercel (CNAME to `cname.vercel-dns.com`).
3. Add `subdomain` to each record you want mapped.

> Reserved labels (not treated as subdomains): `www`, `prompt-vault`, and the
> bare apex. Those serve the normal homepage.

---

## Uploading an image to Onyx Base (for `imageUrl`)

```bash
# 1. upload
curl -X POST https://onyxbase-phi.vercel.app/api/files \
  -H "Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883" \
  -F "file=@photo.jpg" -F "label=my art" -F "public=true"
# → { "ok": true, "file": { "fileId": "f_abc123", ... } }

# 2. the canonical URL is:
#    https://onyxbase-phi.vercel.app/f/<fileId>
#    Put that into the record's `imageUrl` field.
```

> Use the `onyxbase-phi.vercel.app` base for the `/f/<fileId>` URL — that's the
> host your key is scoped to. The upload response's `downloadUrl` may point to a
> different Onyx Base host that does not serve the file; always rewrite it to
> `https://onyxbase-phi.vercel.app/f/<fileId>`.

---

## End-to-end: add a prompt that shows up on the site

```bash
# 1. (optional) upload an image
FILE=$(curl -s -X POST https://onyxbase-phi.vercel.app/api/files \
  -H "Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883" \
  -F "file=@cover.jpg" -F "public=true" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).file.fileId))")
echo "fileId: $FILE"

# 2. make sure a category exists
curl -s -X POST https://onyxbase-phi.vercel.app/v1/set \
  -H "Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883" \
  -H "Content-Type: application/json" \
  -d '{"collection":"categories","key":"cat_ai_art","value":{"id":"cat_ai_art","name":"AI Art","slug":"ai-art","description":"Generative art","imageUrl":null,"featured":true,"promptCount":0,"createdAt":"2026-09-05T00:00:00.000Z"}}'

# 3. create the prompt record
curl -s -X POST https://onyxbase-phi.vercel.app/v1/set \
  -H "Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883" \
  -H "Content-Type: application/json" \
  -d "{
    \"collection\":\"prompts\",
    \"key\":\"prompt:my-art-prompt\",
    \"value\":{
      \"id\":\"my-art-prompt\",
      \"slug\":\"my-art-prompt\",
      \"title\":\"My Art Prompt\",
      \"description\":\"A beautiful AI art prompt.\",
      \"prompt\":\"[SYSTEM]\nYou are an artist.\n[STYLE]\nVibrant, cinematic.\",
      \"imageUrl\":\"https://onyxbase-phi.vercel.app/f/$FILE\",
      \"imageAlt\":\"AI art\",
      \"categoryId\":\"cat_ai_art\",
      \"authorName\":\"Me\",
      \"tags\":[\"ai art\",\"cinematic\"],
      \"featured\":true,
      \"published\":true,
      \"subdomain\":\"myart\",
      \"views\":0,\"copies\":0,\"likes\":0,\"saves\":0,
      \"createdAt\":\"2026-09-05T00:00:00.000Z\",
      \"updatedAt\":\"2026-09-05T00:00:00.000Z\"
    }
  }"

# 4. visit http://localhost:3000/  (or your prod URL) — it appears automatically.
#    visit http://localhost:3000/?subdomain=myart — it auto-opens the prompt.
```

No rebuild, no admin panel, no code change. The app fetches Onyx Base on every
request (short-TTL cache) and renders whatever is there.
