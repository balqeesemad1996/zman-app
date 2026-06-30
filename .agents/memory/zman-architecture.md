---
name: Zman financial safety architecture
description: Non-negotiable rules for the Zman workshop management system
---

## Stack
- Next.js 15.3.4 (App Router, Server Actions) — installed via `--registry https://registry.npmjs.org`
- Drizzle ORM + postgres (not pg) with proper SQL migrations
- pnpm workspace at `artifacts/zman-app`
- Auth: httpOnly cookie `zman_session` = PASSCODE env var value
- DB: DATABASE_URL (Replit Postgres), PASSCODE secret

## Non-Negotiable Financial Safety Rules
1. **All financial DB writes inside `db.transaction()`** — no exceptions
2. **Every financial UPDATE uses `WHERE id = $1 AND updated_at = $2`** — optimistic concurrency
3. **`convertOrderToSale` must be idempotent** — partial unique index on `sales.order_id`
4. **Auth via httpOnly cookie** — never localStorage or Bearer tokens
5. **Migrations additive only** — no DROP, no destructive ALTER
6. **CHECK constraints on every text column (length) and every money/qty column (>= 0 or > 0)**
7. **Reports aggregated server-side with SQL SUM()** — never from raw rows client-side

## Database Schema (from Drizzle migrations)
- `order` table with `status` CHECK constraint ('draft','sent','confirmed','delivered','cancelled')
- `order_component` table
- `idempotency_key` table (for convertOrderToSale idempotency)
- `expense`, `purchase`, `sale` tables with CHECK constraints
- `sale` has partial unique index on `order_id` (WHERE not null and not deleted)

## Auth Flow
- `PASSCODE` env var (also checks `APP_PASSCODE` as fallback)
- Middleware at `src/middleware.ts` reads `zman_session` cookie
- Login Server Action at `src/app/login/actions.ts` sets httpOnly cookie

## Installation Command for Future Updates
```bash
pnpm install --filter @workspace/zman-app --registry https://registry.npmjs.org
```
