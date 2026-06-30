# Zman — نظام إدارة ورش الزهور

نظام إدارة داخلي لورشة زهور وبادية أردنية. يتضمن إدارة الطلبات، المشتريات، المصاريف، المبيعات، ولوحة تحكم مالية. واجهة عربية RTL.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/zman-app run dev` — run the frontend (port 20082, via artifact workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-set by Replit DB)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vite + React + Tailwind v4 + wouter + TanStack Query + Sonner
- API: Express 5 (port 8080)
- DB: PostgreSQL (Replit built-in) + Drizzle ORM
- Auth: single shared passcode (set via `PASSCODE` Replit Secret), stored in `localStorage` key `zman_session` after backend verification
- Money: integer fils (×1000 for JOD), `Intl.NumberFormat('ar-JO-u-nu-latn')`, 3 decimals
- CSS theme: `--color-canvas #f5f4f0`, `--color-paper #fff`, `--color-ink #1a1a1a`, font Cairo

## Where things live

- `lib/db/src/schema/` — Drizzle schema (orders, order_components, purchases, expenses, sales)
- `artifacts/api-server/src/routes/` — REST routes (orders, finance, dashboard, health)
- `artifacts/zman-app/src/features/*/queries.ts` — TanStack Query fetch functions (call API)
- `artifacts/zman-app/src/features/*/actions.ts` — mutation functions (call API)
- `artifacts/zman-app/src/features/*/hooks.ts` — TanStack Query hooks (untouched)
- `artifacts/zman-app/src/lib/api.ts` — shared fetch wrapper with error handling
- `artifacts/zman-app/src/lib/store.ts` — legacy localStorage (kept but no longer imported)

## Architecture decisions

- Frontend calls `/api/*` which Vite proxies to `localhost:8080` in dev
- All data lives in PostgreSQL; localStorage layer (`store.ts`) is deprecated
- Soft deletes via `deletedAt` timestamp column on all main tables
- Cursor-based pagination on all list endpoints (by `createdAt` desc)
- Money stored as integer fils throughout (no floats)

## Product

- **الطلبات**: إنشاء وتتبع طلبات العملاء مع مكونات التكلفة
- **المالية**: تسجيل المشتريات، المصاريف، والمبيعات
- **لوحة التحكم**: ملخص مالي + آخر النشاطات + رسم بياني للاتجاهات
- **التقارير**: تصدير تقارير P&L، المبيعات، المصاريف، الطلبات، المنتجات

## User preferences

- واجهة عربية RTL كاملة، اللغة: عربية أردنية
- الـ passcode: مخزّن في `PASSCODE` Replit Secret

## Gotchas

- Vite proxy only works when Vite dev server is running (port 20082). API calls in production need proper reverse proxy config.
- `pnpm --filter @workspace/db run push` needs DATABASE_URL env var — always provisioned in dev.
- The artifact workflow `artifacts/zman-app: web` manages the frontend; do NOT add a separate "Start application" workflow (port conflict).
- `drizzle-kit push` uses `--force` flag (`push-force`) to skip interactive prompts in CI.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- DB schema: `lib/db/src/schema/index.ts`
- API spec (informal): Express routes in `artifacts/api-server/src/routes/`
