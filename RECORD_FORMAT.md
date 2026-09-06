# Onyx Base Record Format — PromptVault

Onyx Base is the **single source of truth**. You add records directly in Onyx Base
(via the dashboard, CLI, or REST API) and the app fetches them automatically —
**no admin panel needed for content**.

> **Connection**
> - URL: `https://onyxbase-phi.vercel.app`
> - Auth header: `Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883`
> - One collection holds everything: **`prompts`**.

---

## The one collection: `prompts`

Everything (prompts, images, MeiGen-ingested entries) lives in the `prompts`
collection. There is **no separate `images` collection**. Each record = one JSON
value stored under a key.

### Key format
`prompts:<id>`  (e.g. `prompts:community_27c4377b-0694-4269-ba98-9a209f799364`)

> The app also accepts the `prompt:` prefix (no 's') and bare ids — use whichever
> you prefer. `prompts:<id>` is the canonical form used by the MeiGen ingester.

---

## How to add a record

### Option A — REST (one call)

```bash
curl -X POST https://onyxbase-phi.vercel.app/v1/set \
  -H "Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "prompts",
    "key": "prompts:my-art-prompt",
    "value": { …see below… }
  }'
```

### Option B — Onyx Base dashboard
Open the Onyx Base app → your account → `prompts` collection → add key → paste JSON.

### Option C — `onyx` CLI
```bash
onyx login --server https://onyxbase-phi.vercel.app --key kv_live_530f8a6cbaecd103c0ae05ab3883
onyx set prompts prompts:my-art-prompt --value '{"prompt":"…"}'
```

---

## Record schema (minimal — only `prompt` is truly required)

The app is tolerant: it derives `title` and `description` from the prompt text if
you don't provide them, and defaults all optional fields. So the **simplest valid
record** is:

```json
{
  "prompt": "Your prompt text here."
}
```

### Full schema (all fields, with defaults shown)

```json
{
  "prompt": "Premium 4:5 advertising poster for a premium breakfast cereal brand…",
  "imageUrl": "https://images.meigen.ai/generations/2026-09/community_27c4377b.png",
  "previewUrl": "https://images.meigen.ai/generations/2026-09/community_27c4377b.png",
  "title": "Premium Breakfast Cereal Poster",
  "description": "A premium advertising poster prompt for breakfast cereal.",
  "author": "Ahmed Nagaty",
  "tags": ["advertising", "food", "photorealistic"],
  "categoryId": null,
  "featured": false,
  "published": true,
  "subdomain": null,
  "sourceUrl": "https://www.meigen.ai/api/search?Male",
  "sourceId": "community_27c4377b-0694-4269-ba98-9a209f799364",
  "model": "gptimage",
  "pinterest": { "status": "pending" },
  "views": 0,
  "copies": 0,
  "likes": 0,
  "saves": 0,
  "createdAt": "2026-09-05T00:00:00.000Z",
  "updatedAt": "2026-09-05T00:00:00.000Z"
}
```

### Field reference

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `prompt` | string | **yes** | — | the prompt text; `[SECTION]` headers enable the collapsible viewer |
| `imageUrl` | string\|null | no | `null` | image URL (Onyx Base file URL, MeiGen URL, or any CDN) |
| `previewUrl` | string\|null | no | `null` | fallback/preview image URL |
| `title` | string | no | derived from `prompt` (first sentence, ≤70 chars) | display title |
| `description` | string | no | derived from `prompt` (first 160 chars) | card summary |
| `author` | string | no | `"Anonymous"` | author name (also accepts `authorName`) |
| `tags` | string[] | no | `[]` | for filtering & search |
| `categoryId` | string\|null | no | `null` | must match a `cat:<id>` in the `categories` collection; `null` = Uncategorized |
| `featured` | boolean | no | `false` | shows in "Featured" on homepage |
| `published` | boolean | no | `true` | `false` hides from public views |
| `subdomain` | string\|null | no | `null` | subdomain slug → see §Subdomain mapping |
| `sourceUrl` | string\|null | no | `null` | original source URL (e.g. MeiGen search link) |
| `sourceId` | string\|null | no | `null` | id at the source provider (used for dedupe) |
| `model` | string\|null | no | `null` | model used (e.g. `gptimage`, `midjourney`) |
| `pinterest` | object\|null | no | `null` | `{ status: "pending"\|"published"\|"failed", postId, pinUrl, publishedAt }` |
| `views`/`copies`/`likes`/`saves` | number | no | `0` | counters (managed by app) |
| `createdAt`/`updatedAt` | ISO string | no | now | timestamps |

> **Note:** `author` and `authorName` are interchangeable — the app accepts either.
> The MeiGen ingester writes `authorName`, but if you hand-write records you can
> use the shorter `author`.

---

## The record you already have (working example)

This exact record is in your Onyx Base right now and renders on the site:

```json
{
  "prompt": "Premium 4:5 advertising poster for a premium breakfast cereal brand. A white ceramic bowl filled with golden cereal pieces, with one spoon entering the frame and lifting a single crisp piece covered in tiny droplets of fresh milk. Bright morning kitchen, realistic cereal texture, natural sunlight, clean food styling, tactile detail. Typography: \"START CRISP\". Premium food advertising, photorealistic.",
  "imageUrl": "https://images.meigen.ai/generations/2026-09/community_27c4377b-0694-4269-ba98-9a209f799364.png",
  "previewUrl": "https://images.meigen.ai/generations/2026-09/community_27c4377b-0694-4269-ba98-9a209f799364.png",
  "sourceUrl": "https://www.meigen.ai/api/search?Male",
  "sourceId": "community_27c4377b-0694-4269-ba98-9a209f799364",
  "author": "Ahmed Nagaty",
  "model": "gptimage",
  "pinterest": { "status": "pending" }
}
```
Stored under key `prompts:community_27c4377b-0694-4269-ba98-9a209f799364`.
The app derived `title` = "Premium 4:5 advertising poster for a premium breakfast cereal brand"
from the prompt text automatically.

---

## Subdomain mapping

Add a `subdomain` field to any prompt record. When a request arrives on
`<subdomain>.<yourdomain.com>` (or `?subdomain=<slug>` for testing), the app
auto-navigates to that prompt's detail page.

```json
{ "prompt": "…", "subdomain": "myart" }
```
→ `myart.yourdomain.com` shows that prompt.

Reserved labels (serve the homepage): `www`, `prompt-vault`, `prompt-vault-chi-seven`,
and the bare apex.

### Production subdomain setup
1. Add a **wildcard domain** (`*.yourdomain.com`) in Vercel → Settings → Domains.
2. DNS: `*.yourdomain.com` CNAME → `cname.vercel-dns.com`.
3. Add `subdomain` to each record you want mapped.

---

## Other collections (managed by the app)

| Collection | Key format | Holds |
|---|---|---|
| `categories` | `cat:<id>` | category records (you can add these) |
| `config` | `site:config` | one site-config record (auto-created) |
| `comments` | `comment:<id>` | comments (created by the app) |
| `prompt_likes` | `<promptId>:<visitorId>` | like markers (app) |
| `prompt_saves` | `<promptId>:<visitorId>` | save markers (app) |
| `visitors` | `visitor:<id>` | visitor identity (app) |
| `analytics` | `event:<id>` | analytics events (app) |
| `search_terms` | `term:<term>` | search counters (app) |

### Category record (`categories` collection, key `cat:<id>`)

A category is a **list of prompt IDs**. The category's image is automatically the
first prompt's image (`promptIds[0]`). Create/edit categories by adding prompt
IDs to the list.

```json
{
  "name": "Landscapes",
  "slug": "landscapes",
  "description": "Scenic nature prompts",
  "promptIds": ["prompt-id-1", "prompt-id-2", "prompt-id-3"],
  "imageUrl": null,
  "featured": true,
  "createdAt": "2026-09-06T00:00:00.000Z"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | display name |
| `slug` | string | no | derived from name if absent |
| `description` | string\|null | no | |
| `promptIds` | string[] | no | **prompt ids belonging to this category**. Category image = first prompt's image. Edit this list to add/remove prompts. |
| `imageUrl` | string\|null | no | override (leave empty to use first prompt's image) |
| `featured` | boolean | no | shows in homepage category strip |

`promptCount` is computed live from `promptIds.length` — leave it out.

A prompt belongs to a category if its `id` appears in that category's `promptIds`.
The prompt's own `categoryId` field is legacy and ignored when categories use `promptIds`.


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

> Always rewrite the file URL to `https://onyxbase-phi.vercel.app/f/<fileId>` —
> the upload response's `downloadUrl` may point to a different Onyx Base host
> that does not serve the file.

---

## End-to-end: add a prompt that shows up on the site

```bash
# 1. (optional) upload an image
FILE=$(curl -s -X POST https://onyxbase-phi.vercel.app/api/files \
  -H "Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883" \
  -F "file=@cover.jpg" -F "public=true" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).file.fileId))")

# 2. create the prompt record (minimal schema)
curl -s -X POST https://onyxbase-phi.vercel.app/v1/set \
  -H "Authorization: Bearer kv_live_530f8a6cbaecd103c0ae05ab3883" \
  -H "Content-Type: application/json" \
  -d "{
    \"collection\":\"prompts\",
    \"key\":\"prompts:my-art-prompt\",
    \"value\":{
      \"prompt\":\"A cinematic portrait of a robot in golden hour light.\",
      \"imageUrl\":\"https://onyxbase-phi.vercel.app/f/$FILE\",
      \"author\":\"Me\",
      \"tags\":[\"ai art\",\"cinematic\"],
      \"subdomain\":\"myart\"
    }
  }"

# 3. visit https://prompt-vault-chi-seven.vercel.app/ — it appears automatically.
#    visit https://prompt-vault-chi-seven.vercel.app/?subdomain=myart — it auto-opens.
```

No rebuild, no admin panel, no code change. The app fetches Onyx Base on every
request and renders whatever is there.
