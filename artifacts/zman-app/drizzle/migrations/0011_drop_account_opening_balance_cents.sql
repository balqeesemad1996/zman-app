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