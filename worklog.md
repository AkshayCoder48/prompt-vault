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
