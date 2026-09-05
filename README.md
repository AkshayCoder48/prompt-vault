# PromptVault — Prompt Hoster

A modern, full-stack prompt hoster where **Onyx Base is the source of truth**.
Prompts, categories, comments, settings, and ingested images all live in Onyx Base
(Telegram-backed key-value + file store) and are fetched at runtime — change a
record and the site updates on the next fetch, with no redeploy.

## Architecture

```
        Onyx Base (source of truth)
              │
   ┌──────────┼──────────────┐
   ▼          ▼              ▼
 Prompts   Comments       Settings
   │          │              │
   └──────────┼──────────────┘
              ▼
        API service layer   (src/lib/onyxbase/*)
              ▼
         Application        (Next.js API routes)
              ▼
       ┌──────┴──────┐
       ▼             ▼
    Visitors       Admin
```

The frontend is a **dynamic presentation layer** over Onyx Base — nothing is
hardcoded. The app is a client-side SPA on a single `/` route with hash-based
view-state navigation (`#/prompt/:slug`, `#/category/:slug`, `#/search`,
`#/image/:id`, `#/admin`, …).

## Features

- **Database-driven content** — prompts, categories, comments, settings, ad config
  all live in Onyx Base and update live.
- **No signup to browse** — search, view, copy prompts with zero friction. A
  lightweight visitor ID (cookie) powers likes, saves, and commenting.
- **Advanced prompt viewer** — code-editor-like presentation with collapsible
  sections, per-section copy, variable highlighting, char/word counts.
- **Threaded comments** — replies (up to 3 deep), likes, edit/delete own, report,
  moderation states (pending/published/hidden/deleted/reported), sort options.
- **Search & filters** — across title, description, prompt content, tags, author;
  shareable filter URLs; pagination.
- **MeiGen ingestion** — fetch an *existing* MeiGen gallery image, download it,
  upload to Onyx Base (canonical copy), generate metadata via the LLM, create one
  canonical record, dedupe by `meigen:{imageId}`. No hotlinking to MeiGen.
- **Image records** — `/image/:id` route resolves the Onyx Base record (source of
  truth) and renders the canonical image + prompt + attribution.
- **Admin dashboard** — manage prompts, categories, comments (moderation),
  ingest MeiGen images (single + batch), view analytics, edit site settings.
- **Ad slots** — abstract `<AdSlot placement="…"/>` driven by database config;
  disable a placement in settings and it disappears without rebuilding.
- **SEO-ready** — per-prompt metadata, OpenGraph, structured routes.
- **Resilient** — every API call has loading/empty/error/retry states; Onyx Base
  503s are retried with backoff.

## Tech stack

- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York) + lucide-react
- Onyx Base (REST key-value + GraphQL + Files API)
- z-ai-web-dev-sdk (LLM metadata generation — server-side only)

## Getting started

```bash
bun install
cp .env.example .env   # fill in your Onyx Base key
bun run dev            # http://localhost:3000
```

### Seed the database

```bash
bun run src/lib/onyxbase/seed.ts
```

Seeds 10 categories + 10 prompts + default site config into Onyx Base. Cover
images are served from `/seed-img/` (URLs stored as `imageUrl` in each prompt
record — repoint them in Onyx Base anytime).

### Ingest MeiGen images

From the admin dashboard (`/#/admin`, default password `admin123`):
- **Ingest MeiGen** tab → enter a MeiGen image id (or batch search "Male", limit N).
- Images are downloaded, uploaded to Onyx Base, metadata generated, and a
  canonical record created. Duplicates are auto-skipped.

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # SPA root (hash-routed views)
│   ├── layout.tsx
│   └── api/                        # Next.js API routes → Onyx Base
│       ├── prompts/                # list, detail, view/copy/like/save, comments
│       ├── categories/
│       ├── comments/               # edit, delete, like, report
│       ├── search/
│       ├── images/                 # canonical image records
│       ├── settings/
│       ├── analytics/
│       ├── health/
│       └── admin/                  # prompts, categories, comments, ingest, settings
├── components/
│   ├── views/                      # HomeView, PromptDetailView, BrowseView,
│   │                               # CategoryListView, SavedView, AboutView,
│   │                               # ImageDetailView, AdminView
│   ├── comments/                   # CommentsSection, CommentItem, CommentComposer
│   ├── PromptCard.tsx
│   ├── PromptViewer.tsx
│   ├── AdSlot.tsx
│   ├── Header.tsx
│   └── Footer.tsx
└── lib/
    ├── onyxbase/                   # service layer over Onyx Base
    │   ├── client.ts               # REST/GraphQL client (server-side only)
    │   ├── prompts.ts
    │   ├── categories.ts
    │   ├── comments.ts
    │   ├── interactions.ts         # likes/saves
    │   ├── analytics.ts
    │   ├── settings.ts
    │   ├── images.ts               # canonical image records
    │   ├── meigen.ts               # MeiGen ingestion pipeline
    │   ├── llm.ts                  # metadata generation
    │   ├── seed.ts
    │   └── types.ts
    ├── store.ts                    # Zustand SPA navigation
    ├── admin.ts                    # admin auth
    ├── visitor.ts
    ├── api-client.ts
    └── format.ts
```

## Environment variables

| Variable | Description | Side |
|---|---|---|
| `ONYXBASE_URL` | Onyx Base base URL | server |
| `ONYXBASE_API_KEY` | Onyx Base API key (`kv_live_…`) | server |
| `ADMIN_SECRET` | Admin secret | server |
| `MEIGEN_BASE_URL` | MeiGen API base | server |
| `PUBLIC_BASE_URL` | Public site URL | server |
| `PUBLIC_IMAGE_URL_PREFIX` | Image record URL prefix | server |

> **Never** expose `ONYXBASE_API_KEY` to the browser. All privileged operations
> go through server-side API routes.

## License

MIT
