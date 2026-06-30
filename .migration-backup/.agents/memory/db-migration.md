---
name: DB migration architecture
description: How the Zman app moved from localStorage to PostgreSQL; routing and proxy setup
---

## Architecture

- Frontend (port 20082, Vite) calls `/api/*`
- Vite dev proxy forwards `/api` → `localhost:8080` (Express API server)
- API server uses `@workspace/db` (Drizzle + pg pool) to query PostgreSQL

## Key files

- Schema: `lib/db/src/schema/orders.ts`, `lib/db/src/schema/finance.ts`
- Routes: `artifacts/api-server/src/routes/{orders,finance,dashboard}.ts`
- Frontend query layer: `artifacts/zman-app/src/features/*/queries.ts` and `actions.ts`
- Shared fetch wrapper: `artifacts/zman-app/src/lib/api.ts`
- Vite proxy: `artifacts/zman-app/vite.config.ts` → `server.proxy["/api"]`

## Why this way

Vite proxy means the frontend always calls relative `/api/...` paths — no hardcoded host needed in dev or prod (prod will need a proper reverse proxy or same-origin serving). The `store.ts` localStorage layer is kept but no longer imported anywhere; it's dead code.

## Gotchas

- `pnpm --filter @workspace/db run push` must be run whenever schema changes; no auto-migration.
- The `createdAt`/`updatedAt` columns use `mode: 'string'` in Drizzle, returning ISO-like strings matching the old localStorage format.
- Cursor-based pagination on all list endpoints iterates in-memory after fetching (simple, not optimized for large datasets). If data grows >10k rows, switch to `WHERE id < $cursor ORDER BY created_at DESC`.
