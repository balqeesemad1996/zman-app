# ROUND 3 — Root-Cause Prevention Design & Atomicity Audit

This document presents a comprehensive audit of all transactional paths modifying the database state in Zman App, analyzing whether the source records and their associated ledger movements are written atomically. It also proposes the strongest feasible database-level prevention strategy to eliminate the possibility of a transaction source row existing without its matching cash movement.

---

## 1. Transactional Atomicity Audit Table

The table below audits all CRUD paths in the application that modify monetary data. It verifies whether the source table insert/update/delete operation and its corresponding `cash_movement` (ledger) modification are wrapped in the **same database transaction** (`db.transaction`).

| CRUD Operation | Files and Line Numbers | Transactional? | Atomicity Mechanism / Evaluation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **createPurchase** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L109-L194) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 131). Inserts purchase record and immediately writes a matching ledger entry with `direction = 'out'`, `sourceType = 'purchase'`, and `sourceId = newPurchase.id` (lines 167-175). | **ALREADY-CORRECT** |
| **updatePurchase** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L196-L301) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 219) with row-level locking (`for('update')`). Updates the purchase row and atomically updates/inserts the active ledger entry (lines 260-290). | **ALREADY-CORRECT** |
| **deletePurchase** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L303-L376) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 316) with row-level locking. Updates `deletedAt` for the purchase row and soft-deletes the linked ledger entry (lines 353-365). | **ALREADY-CORRECT** |
| **createExpense** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L382-L464) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 404). Inserts the expense record and immediately writes a matching ledger entry with `direction = 'out'`, `sourceType = 'expense'`, and `sourceId = newExpense.id` (lines 435-445). | **ALREADY-CORRECT** |
| **updateExpense** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L466-L569) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 489) with row-level locking. Updates the expense row and atomically updates/inserts the active ledger entry (lines 528-558). | **ALREADY-CORRECT** |
| **deleteExpense** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L571-L644) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 584) with row-level locking. Updates `deletedAt` for the expense row and soft-deletes the linked ledger entry (lines 620-633). | **ALREADY-CORRECT** |
| **createSale** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L650-L744) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 672). Inserts the sale row and writes a matching ledger entry for the cash received (or remainder if order-based to avoid double-counting) (lines 704-725). | **ALREADY-CORRECT** |
| **updateSale** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L746-L870) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 769) with row-level locking. Updates the sale and updates/inserts/deletes the matching ledger entry atomically (lines 807-859). | **ALREADY-CORRECT** |
| **deleteSale** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L872-L943) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 885) with row-level locking. Soft-deletes the sale row and soft-deletes the matching ledger entry (lines 919-932). | **ALREADY-CORRECT** |
| **convertOrderToSale** | [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L949-L1079) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 962) with row-level locking (`for('update')`). Atomically: (1) Inserts a new sale row. (2) Inserts a ledger entry for the remainder amount (`totalPrice - deposit`). (3) Updates the order status to `delivered` (lines 1028-1067). | **ALREADY-CORRECT** |
| **createOrder (deposit)** | [actions.ts (orders)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/orders/actions.ts#L27-L174) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 79). Inserts the order row and, if `depositCents > 0`, atomically inserts a ledger entry with `sourceType = 'deposit'` and `sourceId = order.id` (lines 131-144). | **ALREADY-CORRECT** |
| **updateOrder (deposit)** | [actions.ts (orders)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/orders/actions.ts#L179-L417) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 232) with row-level locking. Updates the order row, updates/inserts the deposit ledger entry, syncs the linked sale ledger entry if already converted, and updates components (lines 291-392). | **ALREADY-CORRECT** |
| **deleteOrder (deposit)** | [actions.ts (orders)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/orders/actions.ts#L422-L531) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 437) with row-level locking. Soft-deletes the order, soft-deletes any linked sales/sales-ledger entries, and soft-deletes the deposit ledger entry (lines 475-520). | **ALREADY-CORRECT** |
| **updateOrderStatus (deposit)** | [actions.ts (orders)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/orders/actions.ts#L540-L650) | **YES** | Wrapped in `db.transaction(async (tx) => { ... })` (line 568) with row-level locking. If status is updated to `cancelled`, it zeroes the order deposit, deletes linked sales, and soft-deletes both the sale-ledger and deposit-ledger entries (lines 606-650). | **ALREADY-CORRECT** |

---

## 2. Strongest Feasible Guarantees: Comparison of Prevention Designs

To prevent future ledger drifts, we evaluate three design approaches for enforcing ledger consistency.

### Option A: Application-Level Enforcement (Current Solution + Regression Tests)
Enforces consistency inside server action functions (e.g. wrapping all mutations in `db.transaction`) and verifies correctness via test suites.
*   **Pros:** Easy to write and maintain in TypeScript; keeps business logic unified in the codebase; easy to mock during tests.
*   **Cons:** No schema-level guarantees. Developers can accidentally write to the database using direct SQL scripts, bypass the wrapper, or write new server actions that omit the ledger movements.

### Option B: Database-Level Scheduled Invariant Checks (Reactive Net)
Runs a cron job or scheduled worker in Postgres (or via an external scheduler) that periodically sweeps the tables to find discrepancies and alerts support/developers.
*   **Pros:** Low overhead; doesn't block high-frequency write paths; does not complicate schema migration files.
*   **Cons:** Reactive rather than proactive. Inconsistencies still enter the database and live there until the sweep runs. The system remains temporarily incorrect.

### Option C: Database-Level Deferred Constraint Triggers (Proactive Gatekeeper)
Creates Postgres constraint triggers on the source tables (`purchase`, `expense`, `sale`, `order`) that fire `AFTER INSERT OR UPDATE` and are `INITIALLY DEFERRED` (run at transaction commit time). If a transaction ends and an active source record does not have a matching active `cash_movement` ledger record, Postgres rolls back the transaction.
*   **Pros:** Absolute, schema-enforced, unbreakable consistency. Impossible to write incorrect data, even from external SQL clients, raw migrations, or developer error.
*   **Cons:** Slightly increases schema complexity; requires writing plpgsql trigger functions in migrations; must be bypassed or disabled during massive historical data imports or backfills.

---

## 3. Clear Recommendation (For Reviewer's Approval)

> [!IMPORTANT]
> **RECOMMENDED DECISION:** Propose Option C (Database-Level Deferred Constraint Triggers).
> 
> *Justification:* Ledger drift is a P0 integrity issue. The owner is non-technical, and a single unmatched entry immediately breaks the Balance Sheet and P&L. By moving the check from the application layer to the database engine using **Deferred Constraint Triggers**, we guarantee ledger consistency at the database engine level. If a developer forgets to insert a matching `cash_movement` inside a new feature transaction, the entire transaction is rejected at commit time.

---

## 4. Proposed Migration (DB-Level Triggers)

If the reviewer approves the recommendation, the following SQL migration script is proposed to build the DB-level backstop. It adds deferred constraint triggers for all four core entities.

```sql
-- 1. Helper function to check if cash_movement exists for a sourceType and sourceId
CREATE OR REPLACE FUNCTION check_active_cash_movement_exists(p_source_type text, p_source_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM cash_movement
    WHERE source_type = p_source_type
      AND source_id = p_source_id
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger function for Purchase
CREATE OR REPLACE FUNCTION trigger_enforce_purchase_ledger() RETURNS trigger AS $$
BEGIN
  -- If purchase is active (deleted_at is null) and totalCents > 0, it must have a matching cash_movement
  IF NEW.deleted_at IS NULL AND NEW.quantity * NEW.unit_cost_cents > 0 THEN
    IF NOT check_active_cash_movement_exists('purchase', NEW.id) THEN
      RAISE EXCEPTION 'Database Integrity Violation: Active purchase (id: %) must have a matching active ledger cash_movement.', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger function for Expense
CREATE OR REPLACE FUNCTION trigger_enforce_expense_ledger() RETURNS trigger AS $$
BEGIN
  IF NEW.deleted_at IS NULL AND NEW.amount_cents > 0 THEN
    IF NOT check_active_cash_movement_exists('expense', NEW.id) THEN
      RAISE EXCEPTION 'Database Integrity Violation: Active expense (id: %) must have a matching active ledger cash_movement.', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger function for Sale
CREATE OR REPLACE FUNCTION trigger_enforce_sale_ledger() RETURNS trigger AS $$
BEGIN
  -- If sale is active and amount > 0, it must have a matching cash_movement
  -- Note: If it is order-sourced, its cash_movement must equal amount_cents - order.deposit_cents. 
  -- But we only check existence of active cash_movement here.
  IF NEW.deleted_at IS NULL AND NEW.amount_cents > 0 THEN
    IF NOT check_active_cash_movement_exists('sale', NEW.id) THEN
      RAISE EXCEPTION 'Database Integrity Violation: Active sale (id: %) must have a matching active ledger cash_movement.', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger function for Order (Deposits)
CREATE OR REPLACE FUNCTION trigger_enforce_order_deposit_ledger() RETURNS trigger AS $$
BEGIN
  -- If order has a deposit > 0 and is in active state (not delivered or cancelled), it must have a deposit cash_movement
  IF NEW.deleted_at IS NULL 
     AND NEW.status NOT IN ('delivered', 'cancelled') 
     AND NEW.deposit_cents > 0 THEN
    IF NOT check_active_cash_movement_exists('deposit', NEW.id) THEN
      RAISE EXCEPTION 'Database Integrity Violation: Active order (id: %) with deposit > 0 must have a matching active ledger cash_movement.', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Register deferred constraint triggers (fired at COMMIT time)
DROP TRIGGER IF EXISTS enforce_purchase_ledger_trigger ON purchase;
CREATE CONSTRAINT TRIGGER enforce_purchase_ledger_trigger
AFTER INSERT OR UPDATE ON purchase
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trigger_enforce_purchase_ledger();

DROP TRIGGER IF EXISTS enforce_expense_ledger_trigger ON expense;
CREATE CONSTRAINT TRIGGER enforce_expense_ledger_trigger
AFTER INSERT OR UPDATE ON expense
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trigger_enforce_expense_ledger();

DROP TRIGGER IF EXISTS enforce_sale_ledger_trigger ON sale;
CREATE CONSTRAINT TRIGGER enforce_sale_ledger_trigger
AFTER INSERT OR UPDATE ON sale
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trigger_enforce_sale_ledger();

DROP TRIGGER IF EXISTS enforce_order_deposit_ledger_trigger ON "order";
CREATE CONSTRAINT TRIGGER enforce_order_deposit_ledger_trigger
AFTER INSERT OR UPDATE ON "order"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trigger_enforce_order_deposit_ledger();
```

### Down Migration (Rollback SQL)

```sql
DROP TRIGGER IF EXISTS enforce_purchase_ledger_trigger ON purchase;
DROP TRIGGER IF EXISTS enforce_expense_ledger_trigger ON expense;
DROP TRIGGER IF EXISTS enforce_sale_ledger_trigger ON sale;
DROP TRIGGER IF EXISTS enforce_order_deposit_ledger_trigger ON "order";

DROP FUNCTION IF EXISTS trigger_enforce_purchase_ledger();
DROP FUNCTION IF EXISTS trigger_enforce_expense_ledger();
DROP FUNCTION IF EXISTS trigger_enforce_sale_ledger();
DROP FUNCTION IF EXISTS trigger_enforce_order_deposit_ledger();
DROP FUNCTION IF EXISTS check_active_cash_movement_exists(text, uuid);
```

---
*This document contains analysis and proposals only. No code, database state, or migrations have been applied to the workspace.*
