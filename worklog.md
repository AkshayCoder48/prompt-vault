# Prompt Hoster — Worklog

Project: Full-stack Prompt Hoster. Database = Onyx Base (source of truth).
Onyx Base URL: https://onyxbase-phi.vercel.app
Storage strategy: Onyx Base key-value collections (prompts, categories, comments, visitors, analytics, config, prompt_likes, prompt_saves) + Files API for images.
Frontend: client-side SPA on single `/` route with view-state navigation. Server-side Next.js API routes proxy to Onyx Base (key stays server-side).

---
Task ID: 0
Agent: orchestrator
Task: Bootstrap plan + verify Onyx Base connectivity

Work Log:
- Read Onyx Base docs via page_reader. Confirmed REST key-value API + GraphQL + Files API.
- Verified key `kv_live_...2611` works against `https://onyxbase-phi.vercel.app` (whoami + health ok).
- Tested /v1/set, /v1/get (needs ?collection=), /v1/list, GraphQL records(collection, limit), RPC search/count, DELETE, /api/files list.
- Set env vars ONYXBASE_URL, ONYXBASE_API_KEY, ADMIN_SECRET in .env.
- Decided NOT to use Prisma (per user instruction). Building lib/onyxbase/* service layer over REST/GraphQL.

Stage Summary:
- Onyx Base confirmed as data source. GraphQL `records(collection, limit)` fetches full collection in one shot — used for list/filter/sort.
- /v1/set {collection,key,value} for writes, /v1/get/{key}?collection= for reads, /v1/list?collection=&prefix= for keys, DELETE /v1/delete/{key}?collection= for deletes.
- Images via POST /api/files (multipart) + POST /api/files/{id}/link for permanent URL.

---
Task ID: S (subdomain mapping + new key + record format)
Agent: orchestrator
Task: Add subdomain field to records, switch to new Onyx Base key, wipe placeholders, document record format

Work Log:
- Verified new key kv_live_530f8a6cbaecd103c0ae05ab3883 → user usr_68qgby on onyxbase-phi.vercel.app (fresh empty account)
- Wiped old account's placeholder data (10 prompts, 5 images, analytics)
- Deleted local /public/seed-img placeholder images
- Added `subdomain` field to Prompt + ImageRecord types
- Added promptService.getBySubdomain + imageService.findBySubdomain
- Created /api/resolve-host route: reads Host header (or ?subdomain= for dev), extracts first label, searches prompts then images for matching subdomain, returns record
- Client (page.tsx) calls /api/resolve-host on mount, auto-navigates to mapped record
- Forwards ?subdomain= query param from page URL to API for local dev/testing
- Added subdomain field to admin Prompt dialog + MeiGen ingest form
- Updated ingest API + meigen.ts to accept subdomain option
- Image source.provider now accepts 'manual' | 'upload' | 'meigen'
- Updated seed script: imageUrl now null (no bundled images)
- Wrote RECORD_FORMAT.md with exact JSON shapes for prompts/images/categories/config + subdomain mapping docs + end-to-end curl examples
- Updated .env + Vercel env var ONYXBASE_API_KEY to new key
- Recovered lost files from GitHub (local .git got reset to stale initial commit; fetched origin/main)
- Deployed to Vercel production (prompt-vault-chi-seven.vercel.app)
- Tested: created prompt+category directly in Onyx Base via curl with subdomain:"myart" → app auto-fetched it → ?subdomain=myart auto-navigated to the prompt detail page

Stage Summary:
- Production: https://prompt-vault-chi-seven.vercel.app (new key, fresh account)
- GitHub: https://github.com/AkshayCoder48/prompt-vault (3 new commits)
- RECORD_FORMAT.md documents exact JSON for direct DB insertion (no admin panel needed)
- Subdomain mapping: each prompt/image record has optional `subdomain` field → app auto-routes
- All placeholder content removed; user adds own records in Onyx Base
