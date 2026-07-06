# MIGRATIONS — ZMAN Financial System

> Ordered, reversible database migrations required by `REMEDIATION_PLAN.md`.
>
> **Migration mechanism (detected from repo):** Drizzle ORM with `drizzle-kit`.
> Config at `artifacts/zman-app/drizzle.config.ts:1-10`:
> ```ts
> export default defineConfig({
>   schema: "./src/lib/db/schema.ts",
>   out: "./drizzle/migrations",
>   dialect: "postgresql",
>   dbCredentials: { url: process.env.DATABASE_URL ?? "" },
> });
> ```
> Existing migrations live at `artifacts/zman-app/drizzle/migrations/` with
> naming `NNNN_descriptive_name.sql` (zero-padded 4-digit sequential). Latest
> is `0010_catalog_snippet_idempotent.sql`. **Next migration number: `0011`.**
>
> **Convention observed in existing migrations:**
> - Use `IF EXISTS` / `IF NOT EXISTS` guards for idempotency
> - Use `--> statement-breakpoint` between statements
> - Use `DO $$ BEGIN ... END $$;` for conditional constraint creation
> - All changes are forward-compatible (app keeps working between deploy and migrate)
>
> **Per the project rule:** after any schema change, the lockfile and generated
> Drizzle artifacts must be regenerated and committed together. The exact
> command (run from `artifacts/zman-app/`):
> ```bash
> pnpm drizzle-kit generate
> pnpm install  # regenerate lockfile if dependencies changed (none expected here)
> ```
> Then commit `pnpm-lock.yaml` (if changed), the new `.sql` migration file, the
> updated `meta/_journal.json`, and the new `meta/NNNN_snapshot.json` together.
>
> **Pure-code fixes (no migration needed):** Fix 1.1, 1.2, 1.3, 2.1, 2.2, 2.3,
> 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 5.1, 5.2, 5.4. These change only
> TypeScript / query logic, not the DB schema.
>
> **Fix requiring migration:** Fix 5.3 (drop dead `account.openingBalanceCents`
> column, F-P2-6).
>
> **No other fix in REMEDIATION_PLAN.md alters the DB schema.** The D1-D6
> decisions are enforced entirely via query changes (cash-basis P&L reads from
> existing `cash_movement` rows; reconciliation uses existing columns; archive
> refusal uses existing `cash_movement` sums; etc.).

---

## Migration 0011 — Drop dead `account.opening_balance_cents` column (F-P2-6)

**Order:** 0011 (next after `0010_catalog_snippet_idempotent.sql`).

**Dependency:** none. Independent of all prior migrations.

**Finding served:** F-P2-6 (Fix 5.3 in `REMEDIATION_PLAN.md`).

**Required for correctness?** **OPTIONAL cleanup.** The column is dead data
(written in 5 places, read by zero aggregates). It does not produce wrong
numbers today — it's a maintenance trap. The owner can defer this migration
indefinitely without affecting correctness. **Recommend applying it during a
scheduled maintenance window** to clean up the schema before the codebase
grows further.

**Why it's safe to apply on a live DB:**
- The column is never read by any code path (verified by static analysis — see
  F-P2-6 evidence in `AUDIT_ANALYSIS.md`).
- Dropping a column in Postgres is metadata-only (fast, no table rewrite)
  since PG 13.
- The Drizzle schema change in `db.ts` must be deployed BEFORE the migration
  runs (so the app doesn't try to write to a dropped column). See deploy order
  below.

**Deploy order (critical):**
1. Deploy app code version N (which no longer writes to `account.openingBalanceCents` — Fix 5.3 code changes).
2. Run migration 0011 (drops the column).
3. Deploy app code version N+1 (which no longer has the column in its Drizzle schema — Fix 5.3 schema change).

Between steps 1 and 3, the column still exists in the DB but the app ignores
it. This is safe (the column is dead).

**Alternative deploy order (also safe):**
1. Deploy app code version N (writes removed, schema still includes the column).
2. Run migration 0011.
3. Deploy app code version N+1 (schema drops the column from `db.ts`).

Either order works because the column is never read.

---

### UP (forward SQL)

**File:** `artifacts/zman-app/drizzle/migrations/0011_drop_account_opening_balance_cents.sql`

```sql
-- 0011_drop_account_opening_balance_cents.sql
-- F-P2-6: drop the dead account.opening_balance_cents column.
-- The column was written in 5 places (createAccount, saveOpeningBalance x4)
-- but never read by any aggregate. The real opening balance feeds from
-- cash_movement(sourceType='opening'), which is unaffected by this drop.
-- See MIGRATIONS.md for the backfill proof (no backfill needed — nothing reads
-- the column).

-- Step 1: drop the CHECK constraint that references the column.
ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_opening_balance_nonnegative";

--> statement-breakpoint

-- Step 2: drop the column itself. Postgres >= 13 does this as a metadata-only
-- operation (no table rewrite), so it's safe on a live table of any size.
ALTER TABLE "account" DROP COLUMN IF EXISTS "opening_balance_cents";
```

**Drizzle schema change (in `src/features/finance/db.ts:186-215`):**

Before (lines 186-215):
```ts
export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'cash' | 'bank'
    openingBalanceCents: integer("opening_balance_cents").notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return [
      check("account_name_length", sql`char_length(${table.name}) <= 200`),
      check("account_type_enum", sql`${table.type} in ('cash', 'bank')`),
      check("account_opening_balance_nonnegative", sql`${table.openingBalanceCents} >= 0`),
      index("account_type_idx")
        .on(table.type)
        .where(sql`deleted_at is null`),
      uniqueIndex("account_default_cash_unique_idx")
        .on(table.name)
        .where(sql`type = 'cash' AND name = 'الصندوق الرئيسي' AND deleted_at IS NULL`),
    ];
  },
);
```

After:
```ts
export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'cash' | 'bank'
    // F-P2-6 / D6: opening_balance_cents column dropped — dead data.
    // The real opening balance lives in cash_movement(sourceType='opening').
    isArchived: boolean("is_archived").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return [
      check("account_name_length", sql`char_length(${table.name}) <= 200`),
      check("account_type_enum", sql`${table.type} in ('cash', 'bank')`),
      // account_opening_balance_nonnegative check removed (column dropped).
      index("account_type_idx")
        .on(table.type)
        .where(sql`deleted_at is null`),
      uniqueIndex("account_default_cash_unique_idx")
        .on(table.name)
        .where(sql`type = 'cash' AND name = 'الصندوق الرئيسي' AND deleted_at IS NULL`),
    ];
  },
);
```

**Code changes that must ship in the same release** (Fix 5.3 in
`REMEDIATION_PLAN.md`):

1. `src/features/finance/schema.ts:87-97` — remove `openingBalanceCents` from
   `accountInputSchema`. The form in `AccountsTab.tsx:257-267` still collects
   the value (still needed to seed the `cash_movement` row at
   `actions.ts:1316-1326`), but it's no longer persisted on the `account` row.
   Pass it as a separate field on the input payload (e.g., `_openingBalanceCents`
   prefixed with `_` to indicate it's not a DB column).

2. `src/features/finance/actions.ts:1309` — in `createAccount`, remove
   `openingBalanceCents: parsed.data.openingBalanceCents` from the `tx.insert(account).values({...})`
   call. Keep the `cash_movement` insert at lines 1316-1326 (that's the real
   opening balance).

3. `src/features/finance/actions.ts:1789, 1795, 1810, 1816` — in
   `saveOpeningBalance`, remove the `.set({ openingBalanceCents: ..., ...})`
   updates to the `account` table. Keep the `cash_movement` upserts at lines
   1854-1939 (those are the real opening balance).

4. `src/features/finance/actions.ts:74` — in `getOrCreateDefaultCashAccount`,
   remove `openingBalanceCents: 0` from the `insert(account).values({...})`
   call (no longer needed).

---

### DOWN (rollback SQL)

**This migration is destructive** (drops a column). Rollback restores the
column but **cannot restore the data** that was in it before the drop.

However, since the column was never read by any code path, the data in it was
redundant with `cash_movement(sourceType='opening')`. After rollback, the
column would be empty (all NULLs, which violates the original `NOT NULL`
constraint — so we restore with a default of 0 and then backfill from the
ledger).

```sql
-- 0011_down.sql (rollback)
-- Restores the account.opening_balance_cents column and backfills it from
-- cash_movement(sourceType='opening') so the column matches the ledger.
-- Note: the column is STILL dead data after rollback (no code reads it).
-- Rollback is only useful if you need to revert the schema to a prior state
-- for compatibility with older app code.

-- Step 1: re-add the column with a default of 0 and NOT NULL.
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "opening_balance_cents" integer NOT NULL DEFAULT 0;

--> statement-breakpoint

-- Step 2: backfill from cash_movement. For each account, sum its
-- sourceType='opening' inflows. This reconstructs the column to match the
-- ledger (which is what the column should have always reflected).
UPDATE "account" a
SET "opening_balance_cents" = COALESCE((
  SELECT SUM(cm.amount_cents)
  FROM "cash_movement" cm
  WHERE cm.account_id = a.id
    AND cm.source_type = 'opening'
    AND cm.direction = 'in'
    AND cm.deleted_at IS NULL
), 0);

--> statement-breakpoint

-- Step 3: re-add the CHECK constraint.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_opening_balance_nonnegative') THEN
    ALTER TABLE "account" ADD CONSTRAINT "account_opening_balance_nonnegative" CHECK ("opening_balance_cents" >= 0);
  END IF;
END $$;
```

**Irreversibility note:** the original column values (before the UP migration)
are lost. The DOWN backfill reconstructs the column from the ledger, which is
the correct value — but if any code was reading the column (it isn't, per
static analysis), it would see ledger-derived values rather than the original
user-entered values. Since the column was never read, this is acceptable.

**Backup requirement:** before running the UP migration, take a verified
backup of the `account` table:
```bash
pg_dump -t account --data-only --column-inserts "$DATABASE_URL" > account_backup_pre_0011.sql
```
Verify the backup file is non-empty and parseable before proceeding.

---

### Data backfill / transform

**No backfill is needed for the UP migration.** The column being dropped is
dead data — nothing reads it. The DROP is purely a schema cleanup.

**The DOWN migration includes a backfill** (Step 2 above) that reconstructs
the column from `cash_movement(sourceType='opening')` if rollback is ever
needed. This is the only "data movement" in either direction.

**Proof that no data is lost by the UP migration:**
1. Static analysis confirms zero read sites for `account.openingBalanceCents`
   (see F-P2-6 in `AUDIT_ANALYSIS.md`).
2. The five write sites (`actions.ts:74, 1309, 1789, 1795, 1810, 1816`) all
   write values that are ALSO written to `cash_movement(sourceType='opening')`
   in the same transaction:
   - `createAccount` at `actions.ts:1316-1326` posts the opening movement.
   - `saveOpeningBalance` at `actions.ts:1854-1939` upserts the opening
     movements for cash and bank accounts.
   - `getOrCreateDefaultCashAccount` at `actions.ts:74` only creates accounts
     with `openingBalanceCents: 0` (line 74), and the conditional insert at
     lines 100-109 only fires if `newAcc.openingBalanceCents > 0` — which is
     never true for the default-cash-account path. So no movement is needed.
3. Therefore, the column is fully redundant with the ledger. Dropping it loses
   no information that isn't already in `cash_movement`.

---

### Safety

- **Idempotent:** both UP and DOWN use `IF EXISTS` / `IF NOT EXISTS` guards.
- **Safe on live DB:** the UP migration runs in <1ms on any size table
  (Postgres metadata-only drop). The DOWN migration runs an UPDATE that
  touches one row per account (typically <100 rows for a small workshop).
- **Order matters:** deploy the app code that stops writing to the column
  BEFORE running the UP migration. See "Deploy order" above.
- **Locking:** `ALTER TABLE ... DROP COLUMN` acquires an
  `ACCESS EXCLUSIVE` lock briefly. For a small workshop's `account` table
  (typically <100 rows), this is sub-millisecond. No special scheduling
  needed.

---

### Verification query (developer runs after UP migration)

```sql
-- 1. Confirm the column is gone.
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'account' AND column_name = 'opening_balance_cents';
-- Expected: 0 rows.

-- 2. Confirm the CHECK constraint is gone.
SELECT conname
FROM pg_constraint
WHERE conname = 'account_opening_balance_nonnegative';
-- Expected: 0 rows.

-- 3. Confirm the opening balance is still derivable from the ledger
--    (this is what the balance sheet uses, unaffected by the migration).
SELECT
  a.id,
  a.name,
  COALESCE(SUM(cm.amount_cents), 0) AS opening_balance_from_ledger_cents
FROM "account" a
LEFT JOIN "cash_movement" cm
  ON cm.account_id = a.id
  AND cm.source_type = 'opening'
  AND cm.direction = 'in'
  AND cm.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name
ORDER BY a.name;
-- Expected: one row per non-deleted account, with the opening balance
-- matching what was previously in the (now-dropped) column.

-- 4. Confirm app still works: open /finance > accounts tab and verify
--    balances display correctly. Open /reports > balance sheet and verify
--    equity.openingCashInEquityCents is unchanged.
```

---

## Summary table

| Migration | Order | Finding | Required? | Destructive? | Backfill needed? |
|---|---|---|---|---|---|
| 0011_drop_account_opening_balance_cents.sql | after 0010 | F-P2-6 (Fix 5.3) | OPTIONAL cleanup | YES (column drop) | No (for UP); yes (for DOWN, reconstructs from ledger) |

**No other migrations are needed.** All other fixes in
`REMEDIATION_PLAN.md` are pure code/query changes that use existing columns
and existing `sourceType` values. Specifically:

- Fix 1.1 (`createSale` deposit subtraction) — uses existing `order.depositCents` column.
- Fix 1.2 (`archiveAccount` balance check) — uses existing `cash_movement` sums.
- Fix 1.3 (`getAccountBalances` includeArchived) — uses existing `account.isArchived` column.
- Fix 2.x (orders/finance separation) — pure UI/query changes.
- Fix 3.x (cash-basis P&L) — reads from existing `cash_movement` rows; no new column needed.
- Fix 4.x (real reconciliation) — derived from existing fields; no new column needed.
- Fix 5.1, 5.2, 5.4 — pure code/UI changes.

---

## Follow-up steps after applying Migration 0011

1. **Regenerate Drizzle artifacts** (mandatory per project rule):
   ```bash
   cd artifacts/zman-app
   pnpm drizzle-kit generate
   ```
   This produces:
   - `drizzle/migrations/0011_drop_account_opening_balance_cents.sql` (the file above — verify it matches)
   - Updated `drizzle/migrations/meta/_journal.json`
   - New `drizzle/migrations/meta/0011_snapshot.json`

2. **Verify no dependency change** — this migration doesn't add or remove any
   npm package, so `pnpm-lock.yaml` should be unchanged. If `pnpm install`
   modifies it for any reason, commit the change.

3. **Commit together** (per project rule):
   - `drizzle/migrations/0011_drop_account_opening_balance_cents.sql`
   - `drizzle/migrations/meta/_journal.json`
   - `drizzle/migrations/meta/0011_snapshot.json`
   - `src/features/finance/db.ts` (column + check removed)
   - `src/features/finance/schema.ts` (field removed from `accountInputSchema`)
   - `src/features/finance/actions.ts` (5 write sites removed)
   - `pnpm-lock.yaml` (only if `pnpm install` modified it)

4. **Apply the migration to production** (after deploying app code version N
   that no longer writes to the column):
   ```bash
   pnpm drizzle-kit migrate
   ```
   Or apply the SQL file directly via `psql` if preferred.

5. **Run the verification queries** above and confirm expected results.

---

## End of MIGRATIONS.md
