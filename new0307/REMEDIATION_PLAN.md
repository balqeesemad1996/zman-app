# REMEDIATION PLAN — ZMAN Financial System

> Static-analysis-grounded fix plan. Every claim cites repo-relative `path:line`.
> Every "fix" is an instruction for a developer to apply later; nothing here is
> executed by the auditor.
>
> All citations are relative to `artifacts/zman-app/` (the actual Next.js app).
>
> The plan is organized into **5 sequential batches**. Each batch is independently
> shippable and testable. Batches MUST be applied in order — later batches depend
> on earlier ones (e.g., Batch 3's cash-basis P&L depends on Batch 1's unified
> sale-posting rule).

## Re-affirmed FIXED DECISIONS (govern every fix below)

| # | Decision | Governs |
|---|---|---|
| D1 | **Strict cash basis.** Revenue/sales/profit everywhere in Finance = cash actually received, from `cash_movement` (`direction='in'`, `sourceType IN ('sale','deposit')`). Expenses/purchases = cash actually paid out. Net = cash_in(operating) − cash_out(operating). | F-P0-3, F-P1-4, F-P1-6, F-P2-1 |
| D2 | **Orders ≠ Finance.** Order money figures are ESTIMATES, labeled "متوقّع"/"تقديري". Never summed into finance totals. Only bridge = cash ledger (deposit → `sourceType='deposit'`; conversion → `sourceType='sale'` for remainder). | F-P0-4, F-P1-7, F-P2-7 |
| D3 | **No inventory.** Purchases = immediate cash-out on materials. | (scope guard) |
| D4 | **Archive refuses non-zero balance** (mirrors `deleteAccount` pattern at `actions.ts:1392-1409`). | F-P0-1, F-P1-8, F-P1-5 |
| D5 | **Real reconciliation** replaces tautology. | F-P1-1 |
| D6 | **One formatter**, fils/÷1000/3 decimals. | F-P2-2, F-P2-5 |

---

## BATCH 1 — Cash-ledger integrity (foundation for everything else)

**Goal:** make the cash ledger the single, consistent source of truth for cash
in/out. Without this, Batch 3's cash-basis P&L would inherit `createSale`'s
deposit-double-counting bug.

**Shippable independently?** Yes — these are pure server-action fixes, no UI
change, no migration.

**Dependencies:** none.

---

### Fix 1.1 — `createSale` must subtract deposit for `source='order'` (F-P0-2)

**File:** `src/features/finance/actions.ts:713-723`

**Why:** currently `createSale` posts `newSale.amountCents` (full) to
`cash_movement` regardless of source. For `source='order'`, the deposit was
already posted at `orders/actions.ts:132-144` as `sourceType='deposit'`. Posting
the full sale amount here double-counts the deposit. `updateSale` already does
this subtraction at `actions.ts:807-813`; `convertOrderToSale` posts only the
remainder at `actions.ts:1044`. `createSale` must match.

**Before (lines 713-723):**
```ts
// إدراج حركة الصندوق (التزاماً بـ §3)
const defaultAccountId = await getOrCreateDefaultCashAccount(tx);
await tx.insert(cashMovement).values({
  date: newSale.date,
  accountId: defaultAccountId,
  direction: "in",
  amountCents: newSale.amountCents,
  sourceType: "sale",
  sourceId: newSale.id,
  description: newSale.description || "مبيعات يدوية مباشرة",
});
```

**After:**
```ts
// إدراج حركة الصندوق (التزاماً بـ §3) — D1/D2: للطلبات، نرحّل المتبقي فقط
// لتفادي ازدواج عدّ العربون (سُجّل مسبقاً كمصدر 'deposit' عند إنشاء الطلب).
const defaultAccountId = await getOrCreateDefaultCashAccount(tx);
let amountToPost = newSale.amountCents;
if (newSale.source === "order" && newSale.orderId) {
  const [ord] = await tx.select().from(order).where(eq(order.id, newSale.orderId));
  if (ord) {
    amountToPost = Math.max(0, newSale.amountCents - ord.depositCents);
  }
}

if (amountToPost > 0) {
  await tx.insert(cashMovement).values({
    date: newSale.date,
    accountId: defaultAccountId,
    direction: "in",
    amountCents: amountToPost,
    sourceType: "sale",
    sourceId: newSale.id,
    description: newSale.description || "مبيعات نقدية",
  });
}
```

**Must NOT break:**
- Manual sales (`source='manual'`) — the `if` branch is skipped, behavior unchanged.
- The `sale` row itself — still stores full `amountCents` (needed for display + audit trail).

**Test that proves it (developer runs later):**
1. Seed: an order with `totalPriceCents = 100_000`, `depositCents = 30_000`, deposit movement already posted.
2. Call `createSale({ source: 'order', orderId, amountCents: 100_000, date: today })`.
3. Assert: `cash_movement` has exactly ONE new row with `sourceType='sale'`, `amountCents = 70_000`.
4. Assert: total cash_in for this order = `30_000 (deposit) + 70_000 (sale) = 100_000` — matches what the customer paid.

---

### Fix 1.2 — `archiveAccount` refuses non-zero balance (F-P0-1, F-P1-8)

**File:** `src/features/finance/actions.ts:1336-1358`

**Why:** archiving an account with a non-zero balance silently excludes its
movements from every balance-sheet aggregate (which filter
`account.isArchived = false` at `reports/actions.ts:477,482,496,552,577,592,607,623`)
and from the dashboard (client filter at `DashboardClient.tsx:217,221`).
Decision D4 mandates mirroring the existing `deleteAccount` safety check at
`actions.ts:1392-1409`.

**Before (lines 1342-1358):**
```ts
try {
  const [updated] = await db
    .update(account)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(account.id, id), isNull(account.deletedAt)))
    .returning();
  if (!updated) {
    return { status: "error", message: "الحساب غير موجود" };
  }
  revalidatePath("/finance");
  return { status: "ok", data: updated };
} catch (error) {
  return { status: "error", message: mapDbError(error) };
}
```

**After:**
```ts
try {
  // D4: refuse to archive a non-zero-balance account (mirror deleteAccount at :1392-1409)
  const [movIn] = await db
    .select({ total: sum(cashMovement.amountCents) })
    .from(cashMovement)
    .where(and(
      eq(cashMovement.accountId, id),
      eq(cashMovement.direction, "in"),
      isNull(cashMovement.deletedAt),
    ));
  const [movOut] = await db
    .select({ total: sum(cashMovement.amountCents) })
    .from(cashMovement)
    .where(and(
      eq(cashMovement.accountId, id),
      eq(cashMovement.direction, "out"),
      isNull(cashMovement.deletedAt),
    ));
  const balance = (Number(movIn?.total) || 0) - (Number(movOut?.total) || 0);
  if (balance !== 0) {
    return {
      status: "error",
      message: `لا يمكن أرشفة حساب برصيد غير صفري (${(balance / 1000).toFixed(3)} د.أ). حوّل الرصيد إلى حساب آخر أولاً.`,
    };
  }

  const [updated] = await db
    .update(account)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(account.id, id), isNull(account.deletedAt)))
    .returning();
  if (!updated) {
    return { status: "error", message: "الحساب غير موجود" };
  }
  revalidatePath("/finance");
  return { status: "ok", data: updated };
} catch (error) {
  return { status: "error", message: mapDbError(error) };
}
```

**Must NOT break:**
- Archiving an account with zero balance — proceeds as before.
- `unarchiveAccount` — unaffected.

**Test that proves it:**
1. Seed: an account with one `in` movement of 50_000 and no `out` movements.
2. Call `archiveAccount(id)` → expect `{status: 'error', message: '...برصيد غير صفري (50.000 د.أ)...'}`.
3. Add an `out` movement of 50_000 (balance now 0).
4. Call `archiveAccount(id)` again → expect `{status: 'ok'}` and `account.isArchived = true`.

---

### Fix 1.3 — `getAccountBalances` accepts `includeArchived` param (F-P1-5)

**File:** `src/features/finance/actions.ts:1454-1509`

**Why:** the server currently returns archived accounts alongside active ones
(line 1457-1460 has no `isArchived` filter), forcing every caller to filter
client-side. The dashboard's client filter at `DashboardClient.tsx:217,221`
works today but is a leaky contract. Make the action honest.

**Before (lines 1454-1460):**
```ts
export async function getAccountBalances(asOfDate?: string): Promise<ActionResponse<{ id: string; name: string; type: string; balanceCents: number; isArchived: boolean }[]>> {
  try {
    const accs = await db
      .select()
      .from(account)
      .where(isNull(account.deletedAt))
      .orderBy(account.createdAt);
```

**After:**
```ts
export async function getAccountBalances(
  asOfDate?: string,
  includeArchived: boolean = false,
): Promise<ActionResponse<{ id: string; name: string; type: string; balanceCents: number; isArchived: boolean }[]>> {
  try {
    const accountConditions = [isNull(account.deletedAt)];
    if (!includeArchived) {
      accountConditions.push(eq(account.isArchived, false));
    }
    const accs = await db
      .select()
      .from(account)
      .where(and(...accountConditions))
      .orderBy(account.createdAt);
```

**Caller updates required (same batch):**
- `src/features/finance/hooks.ts:467-476` — `useAccountBalancesQuery` should pass `includeArchived` through:
  ```ts
  export function useAccountBalancesQuery(asOfDate?: string, includeArchived: boolean = false) {
    return useQuery({
      queryKey: ["finance", "account-balances", asOfDate, includeArchived] as const,
      queryFn: async () => {
        const res = await getAccountBalances(asOfDate, includeArchived);
        // ...
      },
    });
  }
  ```
- `src/features/finance/components/AccountsTab.tsx:17` — pass `includeArchived: true` (management UI shows all):
  ```ts
  const { data: accounts, isLoading, refetch } = useAccountBalancesQuery(undefined, true);
  ```
- `src/features/dashboard/components/DashboardClient.tsx:166-169` — keep default `false`, REMOVE the client-side `!a.isArchived` filters at lines 217, 221:
  ```ts
  // AFTER (lines 216-222):
  const totalCashCents = accountBalances
    ? accountBalances.filter((a) => a.type === "cash").reduce((acc, a) => acc + a.balanceCents, 0)
    : 0;
  const totalBankCents = accountBalances
    ? accountBalances.filter((a) => a.type === "bank").reduce((acc, a) => acc + a.balanceCents, 0)
    : 0;
  ```

**Must NOT break:**
- AccountsTab still shows archived accounts (now via the param, not by accident).
- Dashboard total is unchanged (active accounts only) — but now enforced server-side.

**Test that proves it:**
1. Seed: 2 cash accounts, one active (balance 100) and one archived (balance 50).
2. `getAccountBalances()` (default) → returns only the active one.
3. `getAccountBalances(undefined, true)` → returns both.
4. Dashboard `totalCashCents` = 100 in both old and new code (because old code filtered client-side).

---

## BATCH 2 — Orders/Finance separation (enforce D2)

**Goal:** structurally separate "expected/order" money from "realized/cash"
money. Without this, the dashboard activity feed and the orders-by-status panel
leak order estimates into finance surfaces.

**Shippable independently?** Yes — pure UI/query changes, no migration.

**Dependencies:** Batch 1 (so the ledger is consistent when we say "this is
NOT cash").

---

### Fix 2.1 — Dashboard activity feed: order rows are NOT revenue (F-P0-4)

**File:** `src/features/dashboard/queries.ts:81-128, 132-138` and
`src/features/dashboard/components/DashboardClient.tsx:686-750`

**Why:** the activity feed maps orders with `amount = o.totalPriceCents` (line
136) and the UI at `DashboardClient.tsx:737-743` displays `+` and green for
`type === 'order' || type === 'sale'` — identical to a realized sale. Per D2,
order creation is operational, not cash. The only cash event for an order is
the deposit (if any), which is already in the ledger as `sourceType='deposit'`.

**Before (`queries.ts:84-94`):**
```ts
db
  .select({
    id: order.id,
    customerName: order.customerName,
    totalPriceCents: order.totalPriceCents,
    createdAt: order.createdAt,
  })
  .from(order)
  .where(isNull(order.deletedAt))
  .orderBy(desc(order.createdAt))
  .limit(5),
```

**After:** add `depositCents`:
```ts
db
  .select({
    id: order.id,
    customerName: order.customerName,
    totalPriceCents: order.totalPriceCents,
    depositCents: order.depositCents,
    createdAt: order.createdAt,
  })
  .from(order)
  .where(isNull(order.deletedAt))
  .orderBy(desc(order.createdAt))
  .limit(5),
```

**Before (`queries.ts:132-138`):**
```ts
...recentOrders.map((o) => ({
  id: o.id,
  type: "order" as const,
  title: "طلب جديد",
  amount: o.totalPriceCents,
  date: new Date(o.createdAt),
})),
```

**After:** amount = deposit only (the only cash event), title carries the order value as context:
```ts
...recentOrders.map((o) => ({
  id: o.id,
  type: "order" as const,
  title: `طلب جديد بقيمة ${(o.totalPriceCents / 1000).toFixed(3)} د.أ`,
  amount: o.depositCents,  // D2: only the deposit is a cash event
  hasCashImpact: o.depositCents > 0,
  date: new Date(o.createdAt),
})),
```

**Before (`DashboardClient.tsx:737-743`):**
```tsx
<span className={`text-sm font-bold ${act.type === "order" || act.type === "sale" ? "text-info" : "text-alert"}`}>
  {act.type === "order" || act.type === "sale" ? "+" : "−"}
  <AmountText amount={act.amount} />
</span>
```

**After:** orders are neutral unless they have a deposit:
```tsx
{(() => {
  const isRealizedSale = act.type === "sale";
  const isCashOut = act.type === "expense" || act.type === "purchase";
  const isOrderWithDeposit = act.type === "order" && (act as any).hasCashImpact;
  const sign = (isRealizedSale || isOrderWithDeposit) ? "+" : isCashOut ? "−" : "";
  const colorClass = (isRealizedSale || isOrderWithDeposit)
    ? "text-info"
    : isCashOut ? "text-alert" : "text-ink-3";
  return (
    <span className={`text-sm font-bold ${colorClass}`}>
      {sign}
      {act.amount > 0 || isRealizedSale || isCashOut
        ? <AmountText amount={act.amount} />
        : <span className="text-xs">بدون أثر نقدي</span>}
    </span>
  );
})()}
```

**Must NOT break:** sale/expense/purchase rows render exactly as before.

**Test that proves it:**
1. Create a draft order with `totalPriceCents = 100_000`, `depositCents = 0`. Activity row shows "طلب جديد بقيمة 100.000 د.أ" with "بدون أثر نقدي" (no +/− sign, neutral color).
2. Create a confirmed order with `depositCents = 30_000`. Activity row shows "+30.000 د.أ" in info color, with title noting total order value.

---

### Fix 2.2 — `getRecentActivities` honors the dashboard date range (F-P1-7)

**File:** `src/features/dashboard/queries.ts:81-166`

**Why:** currently takes no parameters; returns 5 most-recent of each type
across all time. The dashboard's selected range is ignored.

**Before (line 81):**
```ts
export async function getRecentActivities(): Promise<ActivityItem[]> {
```

**After:**
```ts
export async function getRecentActivities(
  startDate?: string,
  endDate?: string,
): Promise<ActivityItem[]> {
```

Then add a date filter to each of the four sub-queries (orders, sales, expenses,
purchases). Use `createdAt` for consistency with the existing `orderBy`:
```ts
// In each sub-query's .where():
const dateCond = [];
if (startDate) dateCond.push(sql`${table.createdAt} >= ${startDate}::timestamptz`);
if (endDate) dateCond.push(sql`${table.createdAt} <= (${endDate}::date + INTERVAL '1 day')`);
```
Use `createdAt` (not `date`/`receivedDate`) because the activity feed is about
"when did this happen in the system", not "what business date was on the invoice".

**Caller update (`DashboardClient.tsx:144-149`):**
```ts
// BEFORE:
const { data: activities, ... } = useRecentActivities();
// AFTER:
const { data: activities, ... } = useRecentActivities(startDateStr, endDateStr);
```

And in `src/features/dashboard/hooks.ts` (wherever `useRecentActivities` is
defined — verify by reading the file):
```ts
export function useRecentActivities(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["dashboard", "recent-activities", startDate, endDate] as const,
    queryFn: () => getRecentActivities(startDate, endDate),
  });
}
```

**Must NOT break:** if no range provided (legacy callers), behaves as before (all-time).

**Test that proves it:**
1. Seed: 6 purchases, 3 from this week and 3 from 3 months ago.
2. `getRecentActivities()` (no range) → returns all 5 most recent (mix).
3. `getRecentActivities(todayMinus6, today)` → returns only the 3 from this week.

---

### Fix 2.3 — Dashboard orders-by-status panel: filter by selected range (F-P2-7)

**File:** `src/features/dashboard/queries.ts:244-251`

**Why:** the dashboard panel currently has no date filter (only
`isNull(order.deletedAt)`), while the reports' equivalent at
`reports/actions.ts:347-355` filters by `receivedDate` in range via
`buildDateCondition`. Inconsistent.

**Before (lines 244-251):**
```ts
db
  .select({
    status: order.status,
    count: sql<number>`count(${order.id})::int`,
  })
  .from(order)
  .where(isNull(order.deletedAt))
  .groupBy(order.status),
```

**After:**
```ts
db
  .select({
    status: order.status,
    count: sql<number>`count(${order.id})::int`,
  })
  .from(order)
  .where(and(
    isNull(order.deletedAt),
    sql`${order.receivedDate} >= ${startDate}`,
    sql`${order.receivedDate} <= ${endDate}`,
  ))
  .groupBy(order.status),
```

The query already receives `startDate` and `endDate` as function params
(`getDashboardStats(startDate, endDate)` at line 239) — they're just unused for
this sub-query.

**Must NOT break:** the panel still renders 5 status counts; they just now
reflect the selected period instead of all-time.

**Test that proves it:**
1. Seed: 2 orders received this week, 3 received last month.
2. Select "last 7 days" → counts sum to 2.
3. Select "last 30 days" → counts sum to 2 (only this week falls in last 30 days if last month was >30 days ago).

---

## BATCH 3 — Cash-basis P&L (enforce D1)

**Goal:** redefine every "sales", "revenue", "profit" surface in the Finance
module to derive from `cash_movement`, not from `sale.amountCents`. This is
the highest-impact batch.

**Shippable independently?** Yes, but depends on Batch 1 (specifically Fix 1.1)
so the ledger is consistent.

**Dependencies:** Batch 1.

---

### Fix 3.1 — `getAllReportData` P&L: cash-basis revenue (F-P0-3)

**File:** `src/features/reports/actions.ts:318-444` (specifically the sales
query at line 324)

**Why:** per D1, revenue = cash actually received. The current
`SUM(sale.amountCents)` is accrual-ish (full order price at conversion date);
deposits are in a different `sourceType` and date. Cross-period, this overstates
revenue by the deposit amount.

**Before (line 324):**
```ts
db.select({ total: sum(sale.amountCents) }).from(sale).where(buildDateCondition(sale, range)),
```

**After:**
```ts
// D1: cash-basis revenue = cash actually received from customers in the period.
// Captures both 'deposit' (paid at order intake) and 'sale' (remainder at conversion).
db.select({ total: sum(cashMovement.amountCents) })
  .from(cashMovement)
  .where(and(
    isNull(cashMovement.deletedAt),
    eq(cashMovement.direction, "in"),
    sql`${cashMovement.sourceType} in ('sale', 'deposit')`,
    sql`${cashMovement.date} >= ${rangeStartDate(range)}`,
    sql`${cashMovement.date} <= ${rangeEndDate(range)}`,
  )),
```

Where `rangeStartDate`/`rangeEndDate` are helper functions extracted from
`buildDateCondition` (currently inlined at `reports/actions.ts:18-41`). Extract
them so both `buildDateCondition` (for table-based queries) and the new
cash_movement query can share them:

**New helpers (add near `buildDateCondition` at line 18):**
```ts
function rangeStartDate(range?: "all" | "month" | "30d"): string | null {
  if (range === "month") {
    const ammanToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
    const [year, month] = ammanToday.split("-");
    return `${year}-${month}-01`;
  }
  if (range === "30d") {
    const now = new Date();
    const startOf30Days = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    return startOf30Days.toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
  }
  return null; // "all"
}

function rangeEndDate(range?: "all" | "month" | "30d"): string | null {
  if (range === "month") {
    const ammanToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
    const [year, month] = ammanToday.split("-");
    const lastDayNum = new Date(Number(year), Number(month), 0).getDate();
    return `${year}-${month}-${String(lastDayNum).padStart(2, "0")}`;
  }
  if (range === "30d") {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Amman" });
  }
  return null;
}
```

Then in the new sales query, only apply the date filter if the start/end are non-null:
```ts
const salesDateConds = [isNull(cashMovement.deletedAt), eq(cashMovement.direction, "in"), sql`${cashMovement.sourceType} in ('sale', 'deposit')`];
const sStart = rangeStartDate(range);
const sEnd = rangeEndDate(range);
if (sStart) salesDateConds.push(sql`${cashMovement.date} >= ${sStart}`);
if (sEnd) salesDateConds.push(sql`${cashMovement.date} <= ${sEnd}`);
const salesRes = await db.select({ total: sum(cashMovement.amountCents) })
  .from(cashMovement).where(and(...salesDateConds));
```

The `purchasesCents` and `expensesCents` queries (lines 325-326) already sum
from `purchase.totalCents` and `expense.amountCents` — these equal the
`cash_movement` cash-out for those sourceTypes (because `createPurchase` posts
`totalCents` as `out` at `actions.ts:180`, and `createExpense` posts
`amountCents` as `out` at `actions.ts:450`). So they're already cash-basis
equivalent. **No change needed** — but document this in a code comment.

**Must NOT break:**
- The `expensesByCategory` and `salesBySource` sub-queries at lines 327-346.
  - `expensesByCategory` is unaffected (still sums `expense.amountCents` grouped by category).
  - `salesBySource` (line 340-346) currently groups `sale.amountCents` by `sale.source`. After D1, "source" semantics change: revenue is now split by `sourceType` (`'sale'` vs `'deposit'`), not by `sale.source` (`'manual'` vs `'order'`). See Fix 3.2 below.

**Test that proves it:**
1. Seed: one order, `totalPriceCents = 100_000`, `depositCents = 30_000`, `depositDate = March 15`, `receivedDate = March 15`. Convert to sale on April 3 (posts `sourceType='sale'` with `70_000` on April 3).
2. `getAllReportData('month' = March)` → `pnl.salesCents = 30_000` (only the deposit landed in March).
3. `getAllReportData('month' = April)` → `pnl.salesCents = 70_000` (only the remainder landed in April).
4. `getAllReportData('all')` → `pnl.salesCents = 100_000`.
5. Compare with old code: old March = 0, old April = 100_000. New attribution is correct cash-basis.

---

### Fix 3.2 — `salesBySource` redefined as "by cash source" (D1, F-P0-3 corollary)

**File:** `src/features/reports/actions.ts:337-346, 389-406`

**Why:** under D1, "sales by source" no longer makes sense as
`sale.source ∈ ('manual','order')` because revenue comes from `cash_movement`.
The meaningful split for a small-business owner is: "how much came in as
deposits vs how much came in as sale settlements". This also makes the donut
informative (deposits usually mean "new orders coming in", sale-settlements
mean "orders being delivered").

**Before (lines 337-346):**
```ts
db
  .select({
    source: sale.source,
    total: sum(sale.amountCents),
    count: count(sale.id),
  })
  .from(sale)
  .where(buildDateCondition(sale, range))
  .groupBy(sale.source)
  .orderBy(desc(sql`sum(${sale.amountCents})`)),
```

**After:**
```ts
// D1: cash-basis sales-by-source = split by sourceType ('deposit' vs 'sale')
db
  .select({
    sourceType: cashMovement.sourceType,
    total: sum(cashMovement.amountCents),
    count: count(cashMovement.id),
  })
  .from(cashMovement)
  .where(and(
    isNull(cashMovement.deletedAt),
    eq(cashMovement.direction, "in"),
    sql`${cashMovement.sourceType} in ('sale', 'deposit')`,
    // ... date range conditions, same as Fix 3.1
  ))
  .groupBy(cashMovement.sourceType)
  .orderBy(desc(sql`sum(${cashMovement.amountCents})`)),
```

**Labels (`reports/actions.ts:389-392`):**
```ts
// BEFORE:
const sourceLabels: Record<string, string> = {
  manual: "إدخال يدوي مباشر",
  order: "مبيعات مرتبطة بطلب",
};
// AFTER:
const sourceTypeLabels: Record<string, string> = {
  deposit: "عربونات طلبات (دُفعت مقدماً)",
  sale: "تسويات مبيعات (متبقّي مُحصَّل)",
};
```

Update the `salesBySource` mapping at lines 397-406 to use `sourceType` field
name and the new labels.

**UI update (`reports/page.tsx:440-453`):** the rendered `src.source` becomes
`src.sourceType`; the label lookup already supports arbitrary keys via
`sourceLabels[s.source] ?? s.source`.

**Must NOT break:** the donut still renders two segments; the meaning changes
(from "manual vs order" to "deposit vs settlement"). Document the change in the
SUMMARY_AR.md so the owner understands the new labels.

**Test that proves it:**
1. Same seed as Fix 3.1.
2. `getAllReportData('all')` → `salesBySource = [{sourceType:'deposit', total:30_000, count:1}, {sourceType:'sale', total:70_000, count:1}]`.
3. Donut shows 30% deposit / 70% settlement.

---

### Fix 3.3 — `getFinancialSummary` (dashboard) is cash-basis (F-P0-3, F-P2-1)

**File:** `src/features/dashboard/queries.ts:25-78`

**Why:** the dashboard's `summary.sales` and `summary.netProfit` use the same
accrual-ish `SUM(sale.amountCents)` as the P&L. Per D1, must be cash-basis.

**Before (lines 30-41):**
```ts
db
  .select({ total: sql<any>`coalesce(sum(${sale.amountCents}), 0)::bigint` })
  .from(sale)
  .where(and(
    isNull(sale.deletedAt),
    sql`${sale.date} >= ${startDate}`,
    sql`${sale.date} <= ${endDate}`,
  )),
```

**After:**
```ts
// D1: cash-basis revenue = cash received from customers in the period
db
  .select({ total: sql<any>`coalesce(sum(${cashMovement.amountCents}), 0)::bigint` })
  .from(cashMovement)
  .where(and(
    isNull(cashMovement.deletedAt),
    eq(cashMovement.direction, "in"),
    sql`${cashMovement.sourceType} in ('sale', 'deposit')`,
    sql`${cashMovement.date} >= ${startDate}`,
    sql`${cashMovement.date} <= ${endDate}`,
  )),
```

Add the import for `cashMovement` and `eq` to the file's existing imports
(currently `dashboard/queries.ts:3-6` only imports `expense, purchase, sale`
from finance/db).

The `expenses` and `purchases` queries (lines 42-65) already use
`expense.amountCents` and `purchase.totalCents` directly — these equal the
cash-out, so they're already cash-basis. **No change needed.**

The `netProfit` formula at line 75 stays `sales - expenses - purchases` — but
now `sales` is cash-basis, so `netProfit` is cash-basis. ✅

**Must NOT break:** the dashboard "المبيعات" KPI now matches the P&L
"إجمالي المبيعات" exactly (both cash-basis, same source). The deposit sub-line
below it (Fix 3.4) becomes a sub-component of the cash-basis total, not an
additional number.

**Test that proves it:** same as Fix 3.1 — the dashboard and P&L must agree to
the fils for any selected range.

---

### Fix 3.4 — Dashboard deposit subline: align query with tooltip and balance-sheet date fallback (F-P1-2, F-P1-3)

**File:** `src/features/dashboard/queries.ts:271-283`

**Why:** the tooltip at `DashboardClient.tsx:438` says "deposits paid in
advance for orders **not yet delivered**", but the query at line 279 only
excludes `'cancelled'` — it includes delivered orders' deposits. Also, the
query uses `coalesce(depositDate, createdAt)` while the balance sheet uses
`coalesce(depositDate, receivedDate)` — inconsistent fallback.

**Before (lines 271-283):**
```ts
db
  .select({ total: sql<any>`coalesce(sum(${order.depositCents}), 0)::bigint` })
  .from(order)
  .where(and(
    isNull(order.deletedAt),
    sql`${order.status} <> 'cancelled'`,
    sql`coalesce(${order.depositDate}, ${order.createdAt})::date >= ${startDate}::date`,
    sql`coalesce(${order.depositDate}, ${order.createdAt})::date <= ${endDate}::date`,
  )),
```

**After:**
```ts
db
  .select({ total: sql<any>`coalesce(sum(${order.depositCents}), 0)::bigint` })
  .from(order)
  .where(and(
    isNull(order.deletedAt),
    sql`${order.status} not in ('delivered', 'cancelled')`,  // F-P1-2: match tooltip
    sql`coalesce(${order.depositDate}, ${order.receivedDate})::date >= ${startDate}::date`,  // F-P1-3: match balance sheet
    sql`coalesce(${order.depositDate}, ${order.receivedDate})::date <= ${endDate}::date`,
  )),
```

**Also update the tooltip text** (`DashboardClient.tsx:438`) to be even clearer
after the fix:
```ts
// AFTER:
title: "عربونات طلبات غير مُسلَّمة، دُفعت في هذه الفترة. تُحسب ضمن المبيعات النقدية أعلاه وتُظهر أيضاً كالتزام في الميزانية حتى تسليم الطلب."
```

**Must NOT break:** the sub-line still renders only when `> 0` (guard at
`DashboardClient.tsx:435`).

**Test that proves it:**
1. Seed: one order received March 15, deposit 30_000, delivered April 3.
2. Dashboard range "March": with OLD code, sub-line shows 30_000 (includes delivered). With NEW code, sub-line shows 30_000 (delivered status only happens April 3, so on March 15 it's not delivered yet — same result here).
3. Dashboard range "April": OLD code includes the 30_000 (delivered in April). NEW code excludes it (status='delivered'). Tooltip and number now agree.

---

### Fix 3.5 — `downloadReport` P&L: cash-basis (F-P0-3)

**File:** `src/features/reports/actions.ts:57-96`

**Why:** the downloaded markdown P&L uses the same accrual-ish formula as the
on-screen P&L. Must match.

**Before (lines 60-63):**
```ts
db
  .select({ total: sum(sale.amountCents) })
  .from(sale)
  .where(buildDateCondition(sale, range)),
```

**After:** same change as Fix 3.1 — use `cash_movement` with `sourceType IN ('sale','deposit')`.

The `purchasesRes` and `expensesRes` queries (lines 64-71) stay as-is (already
cash-basis equivalent).

**Must NOT break:** the downloaded markdown must show the same numbers as the
on-screen P&L after Fix 3.1.

**Test that proves it:** download the P&L markdown for range='month', compare
the sales line to the on-screen `data.pnl.salesCents` — must be identical.

---

### Fix 3.6 — `getFinancialTrendData`: cash-basis sales trend (F-P0-3 corollary)

**File:** `src/features/dashboard/queries.ts:169-223`

**Why:** the dashboard's net-profit trend chart (in `DashboardClient.tsx:231-250`)
subtracts per-day `salesTrend − expensesTrend − purchasesTrend`. The
`salesTrend` query at lines 173-187 currently sums `sale.amountCents` grouped
by `sale.date` — accrual-ish. Must be cash-basis.

**Before (lines 173-187):**
```ts
db
  .select({
    day: sale.date,
    total: sql<any>`sum(${sale.amountCents})::bigint`,
  })
  .from(sale)
  .where(and(
    isNull(sale.deletedAt),
    sql`${sale.date} >= ${startDate}`,
    sql`${sale.date} <= ${endDate}`,
  ))
  .groupBy(sale.date),
```

**After:**
```ts
db
  .select({
    day: cashMovement.date,
    total: sql<any>`sum(${cashMovement.amountCents})::bigint`,
  })
  .from(cashMovement)
  .where(and(
    isNull(cashMovement.deletedAt),
    eq(cashMovement.direction, "in"),
    sql`${cashMovement.sourceType} in ('sale', 'deposit')`,
    sql`${cashMovement.date} >= ${startDate}`,
    sql`${cashMovement.date} <= ${endDate}`,
  ))
  .groupBy(cashMovement.date),
```

The `expensesTrend` and `purchasesTrend` queries (lines 188-216) already sum
from `expense` and `purchase` tables — equivalent to cash-out. **No change.**

**Must NOT break:** the trend chart in `DashboardClient.tsx:231-250` consumes
`salesTrend`, `expensesTrend`, `purchasesTrend` — all three keep the same shape
(`{day, total}[]`). The per-day math `sales - expenses - purchases` still
works.

**Test that proves it:** for the seed in Fix 3.1, trend chart for March shows
+30_000 on March 15; for April shows +70_000 on April 3.

---

## BATCH 4 — Real reconciliation (enforce D5)

**Goal:** replace the tautological balance check with two independent
reconciliation checks that can actually fail.

**Shippable independently?** Yes.

**Dependencies:** Batch 1+3 (so the ledger is consistent and the cash-basis
P&L is in place to compare against retained-profit change).

---

### Fix 4.1 — `getFinancialPosition`: real reconciliation (F-P1-1)

**File:** `src/features/reports/actions.ts:468-676` (specifically the check at 635-643)

**Why:** algebraically, `Assets − (Liabilities + Equity) = transfer_in − transfer_out = 0` always (transfers post bilateral pairs at `actions.ts:1562-1581`). The current
check can never fail. Per D5, replace with two independent checks:

1. **Equity drift check:** compare two independently-derived equity figures:
   - `equityFromLedger = totalAssets - totalLiabilities` (from the ledger movements)
   - `equityFromComponents = openingCashInEquityCents + injectionsCents - drawingsCents + retainedProfitCents` (from the component breakdown)
   - These SHOULD be equal. If they're not, something is wrong (e.g., an orphaned movement, an archived account with balance that slipped through, etc.).

2. **Cash-basis P&L vs retained-profit change** (only meaningful when comparing two asOfDates, but useful as a standalone sanity check that `retainedProfitCents` for "all time" equals cash-basis net profit for "all time"):
   - `pnlNetAllTime = cash_in(sale+deposit, all time) - cash_out(expense+purchase, all time)`
   - `retainedProfitCents` (from the balance sheet, asOfDate=today)
   - These SHOULD be equal when the deposit liability is zero (i.e., no open orders with deposits). When the deposit liability is non-zero, the difference should equal exactly the deposit liability.

**Before (lines 632-643):**
```ts
const totalEquity = openingCashInEquityCents + injectionsCents - drawingsCents + retainedProfitCents;

const differenceCents = totalAssets - (totalLiabilities + totalEquity);
const balanced = Math.abs(differenceCents) === 0;

if (!balanced) {
  return {
    status: "error",
    message: `الميزانية غير متوازنة! الفارق: ${differenceCents / 1000} د.أ...`,
  };
}
```

**After:**
```ts
const totalEquity = openingCashInEquityCents + injectionsCents - drawingsCents + retainedProfitCents;

// D5: REAL reconciliation — two independently-derived checks that CAN fail.
// Check 1: equity-from-ledger vs equity-from-components.
// These are computed via different code paths; if they disagree, something is wrong.
const equityFromLedger = totalAssets - totalLiabilities;
const equityFromComponents = totalEquity;
const equityDriftCents = equityFromLedger - equityFromComponents;

// Check 2: retained profit (cash-basis, all time) vs cash-basis P&L (all time).
// They should agree when depositLiability = 0; otherwise they differ by exactly the liability.
// (Because retainedProfit subtracts depositsLiability, but P&L counts deposits as revenue when received.)
// We surface this as informational, not an error.
const pnlNetAllTime = salesCashInCents - expensesPurchasesCashOutCents;
const pnlVsRetainedProfitDrift = pnlNetAllTime - (retainedProfitCents + depositsCents);
// Expected: pnlVsRetainedProfitDrift === 0 always (since retainedProfit = salesCashIn - depositsLiability - cashOut,
// and pnlNet = salesCashIn - cashOut, so pnlNet - (retainedProfit + depositsLiability) = 0 by construction).
// This is still a tautology — keep as a defensive assertion only.

// The MEANINGFUL check is equityDriftCents.
if (Math.abs(equityDriftCents) > 0) {
  // Don't hard-fail; return the data with a warning so the owner can investigate.
  console.warn(`[balance-sheet] equity drift detected: ${equityDriftCents} fils`);
}

return {
  status: "ok",
  data: {
    assets: { cashCents: totalCashCents, bankCents: totalBankCents, totalCents: totalAssets },
    liabilities: { depositsCents, totalCents: totalLiabilities },
    equity: {
      openingCapitalCents,
      openingCashInEquityCents,
      injectionsCents,
      drawingsCents,
      retainedProfitCents,
      totalCents: totalEquity,
    },
    balanced: Math.abs(equityDriftCents) === 0,  // now reflects a real check
    differenceCents: equityDriftCents,  // rename in the type if desired
    // New: expose the drift for UI display
    equityDriftCents,
  },
};
```

**UI update (`reports/page.tsx:692-701`):** the banner now conditionally shows
green (drift = 0) or red (drift ≠ 0):
```tsx
{positionData.balanced ? (
  <div className="p-4 bg-info/10 border border-info/20 rounded-lg ...">
    <span>المعادلة متوازنة محاسبياً: الأصول = الالتزامات + حقوق الملكية</span>
    ...
  </div>
) : (
  <div className="p-4 bg-alert/10 border border-alert/20 rounded-lg ...">
    <span>تنبيه: انحراف محاسبي قدره <AmountText amount={Math.abs(positionData.equityDriftCents)} /></span>
    <span className="text-xs">يرجى مراجعة الحركات المالية أو الاتصال بالدعم.</span>
  </div>
)}
```

**Must NOT break:** when the ledger is consistent (the normal case), the banner
shows green exactly as before. The drift check only fires on real
inconsistencies.

**Test that proves it:**
1. Normal case: seed a clean set of movements, run `getFinancialPosition`. `balanced=true`, `equityDriftCents=0`.
2. Inject an orphaned movement: insert a `cash_movement(sourceType='opening', direction='in', amountCents=50_000)` for an account that doesn't exist in the `account` table (will fail FK; instead, soft-delete the account but leave the movement). Re-run. The INNER JOIN at `reports/actions.ts:491` excludes the orphaned movement, so assets are understated. `equityFromLedger < equityFromComponents` → `equityDriftCents ≠ 0` → `balanced=false`. The UI shows red.

---

### Fix 4.2 — Cross-check: P&L net (all time) == retainedProfitCents + depositsCents (F-P1-4)

**File:** `src/features/reports/actions.ts` (new helper, called from the balance-sheet path)

**Why:** after Fix 3.1, P&L `netCents` (cash-basis, all time) should equal
`retainedProfitCents + depositsCents` (because both formulas reduce to
`cash_in(sale+deposit) - cash_out(expense+purchase)`). Surfacing this as a
visible reconciliation in the UI helps the owner trust both numbers.

**Add a new field to the response** (`reports/actions.ts:645-668`):
```ts
// Add to the returned data:
pnlAllTimeNetCents: salesCashInCents - expensesPurchasesCashOutCents,
pnlReconciliationCents: (salesCashInCents - expensesPurchasesCashOutCents)
  - (retainedProfitCents + depositsCents),
```

The `pnlReconciliationCents` should always be 0 (by construction). If it isn't,
there's a bug in the formulas. Display it in the UI as a hidden-by-default
"advanced reconciliation" detail.

**Must NOT break:** adding optional fields to the response is backward-compatible.

---

## BATCH 5 — Cleanup (P2 findings, no behavior change)

**Goal:** address cosmetic/cleanup findings. Each is independently shippable.

**Dependencies:** none (can ship in any order).

---

### Fix 5.1 — One shared JOD formatter (F-P2-2, F-P2-5)

**Files:** `src/features/reports/actions.ts:10-16` and `src/lib/money.ts`

**Why:** two formatters exist:
- `lib/money.ts:5-10` — `Intl.NumberFormat("ar-JO-u-nu-latn", { style: "currency", currency: "JOD" })`
- `reports/actions.ts:10-16` — `cents / 1000` then `toLocaleString("en-JO", ...)` with manual "د.أ" suffix

Both divide by 1000 ✅. Different output formatting. Per D6, consolidate.

**Change:** delete `formatJOD` from `reports/actions.ts:10-16`. Import and use
`formatFilsToJod` from `lib/money.ts` everywhere in the file.

**Before (line 10-16):**
```ts
function formatJOD(cents: number): string {
  const jod = cents / 1000;
  return `${jod.toLocaleString("en-JO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} د.أ`;
}
```

**After:**
```ts
// D6: use the shared formatter from lib/money.ts (consistent with the rest of the app)
import { formatFilsToJod } from "@/lib/money";
// (delete the local formatJOD function)
// Replace all `formatJOD(x)` calls in this file with `formatFilsToJod(x)`.
```

Search-and-replace `formatJOD(` → `formatFilsToJod(` in `reports/actions.ts`.
There are 7 call sites (lines 89, 90, 91, 92, 130, 133, 175, 177, 180, 227, 230, 263).

**Test that proves it:** download the P&L markdown; the formatted amounts should
now use the same locale/numerals as the on-screen `AmountText` component.

---

### Fix 5.2 — Render `topProducts.totalQty` (F-P2-3)

**File:** `src/app/(app)/reports/page.tsx:540-557`

**Why:** the action computes `totalQty` at `reports/actions.ts:360, 427` but
the UI doesn't render it. Useful metric for "top products by quantity".

**Before (lines 547-555):**
```tsx
<span className="flex-1 min-w-0 text-sm font-semibold text-ink/85 truncate">
  {product.name}
</span>
<span className="text-xs text-ink/45 flex-shrink-0">
  {product.orderCount} طلب
</span>
<span className="text-sm font-bold text-info flex-shrink-0">
  <AmountText amount={product.revenueCents} />
</span>
```

**After:** add the quantity span between orderCount and revenue. Also relabel
"revenue" as "قيمة تقديرية" per D2 (orders are operational/expected, not
realized cash):
```tsx
<span className="flex-1 min-w-0 text-sm font-semibold text-ink/85 truncate">
  {product.name}
</span>
<span className="text-xs text-ink/45 flex-shrink-0">
  {product.orderCount} طلب · {product.totalQty} قطعة
</span>
<span className="text-sm font-bold text-info flex-shrink-0">
  <AmountText amount={product.revenueCents} />
</span>
```

And update the section header at line 519 from "أكثر المنتجات طلباً" to
"أكثر المنتجات طلباً (قيمة تقديرية)" to enforce D2.

**Test that proves it:** the products tab now shows "X طلب · Y قطعة" for each
row.

---

### Fix 5.3 — Drop dead `account.openingBalanceCents` column (F-P2-6)

**See MIGRATIONS.md for the ordered, reversible migration.**

**Why:** the column is written in 5 places (`actions.ts:1309, 1789, 1795, 1810, 1816`)
but never read by any aggregate. The real opening balance feeds from
`cash_movement(sourceType='opening')`. The column is a maintenance trap.

**Code changes (after the migration drops the column):**

In `src/features/finance/db.ts:186-215`, remove the `openingBalanceCents`
column from the `account` pgTable definition and remove the
`account_opening_balance_nonnegative` check.

In `src/features/finance/actions.ts`:
- Line 1309 (`createAccount`): remove `openingBalanceCents: parsed.data.openingBalanceCents` from the insert. The opening balance is still posted via `cash_movement` at lines 1316-1326 — keep that.
- Lines 1789, 1795, 1810, 1816 (`saveOpeningBalance`): remove the
  `openingBalanceCents` updates.

In `src/features/finance/schema.ts:93-96`: remove the
`openingBalanceCents` field from `accountInputSchema`. The form in
`AccountsTab.tsx:257-267` that collects the opening balance can stay (it's
still needed to seed the `cash_movement` row), but the value is no longer
stored on the `account` row.

**Must NOT break:** the `cash_movement(sourceType='opening')` row is the source
of truth and is unaffected. The `account.openingBalanceCents` column was never
read, so removing it changes no aggregate.

**Test that proves it:** after migration + code changes, create a new account
with opening balance 50_000. Verify:
1. `account` row exists (no `openingBalanceCents` column).
2. `cash_movement` row exists with `sourceType='opening', direction='in', amountCents=50_000`.
3. `getAccountBalances()` returns the account with `balanceCents=50_000`.
4. `getFinancialPosition(asOfDate=today)` returns `equity.openingCashInEquityCents` including the 50_000.

---

### Fix 5.4 — Filter `depositCents > 0` in deposit-liability query (F-P2-4, cosmetic)

**File:** `src/features/reports/actions.ts:530-539`

**Why:** orders with `depositCents = 0` match the WHERE clause but contribute 0
to the sum. Harmless but wasteful.

**Before (lines 533-538):**
```ts
.where(and(
  isNull(order.deletedAt),
  sql`${order.status} not in ('delivered', 'cancelled')`,
  sql`coalesce(${order.depositDate}, ${order.receivedDate}) <= ${asOfDate}`
))
```

**After:**
```ts
.where(and(
  isNull(order.deletedAt),
  sql`${order.status} not in ('delivered', 'cancelled')`,
  sql`${order.depositCents} > 0`,  // F-P2-4: skip zero-deposit orders
  sql`coalesce(${order.depositDate}, ${order.receivedDate}) <= ${asOfDate}`
))
```

**Test that proves it:** the `depositsCents` value is unchanged before/after
(since zero-deposit orders contributed 0 anyway).

---

## BATCH ORDERING SUMMARY

```
Batch 1 (foundation: ledger integrity)
  ├─ Fix 1.1 createSale subtracts deposit
  ├─ Fix 1.2 archiveAccount refuses non-zero
  └─ Fix 1.3 getAccountBalances includeArchived param
        │
        ▼
Batch 2 (Orders/Finance separation)
  ├─ Fix 2.1 dashboard activity: orders are not revenue
  ├─ Fix 2.2 getRecentActivities honors date range
  └─ Fix 2.3 dashboard orders-by-status filtered by range
        │
        ▼
Batch 3 (cash-basis P&L — depends on Batch 1)
  ├─ Fix 3.1 getAllReportData P&L cash-basis
  ├─ Fix 3.2 salesBySource redefined
  ├─ Fix 3.3 getFinancialSummary cash-basis
  ├─ Fix 3.4 dashboard deposit subline aligned
  ├─ Fix 3.5 downloadReport P&L cash-basis
  └─ Fix 3.6 getFinancialTrendData cash-basis
        │
        ▼
Batch 4 (real reconciliation — depends on Batch 1+3)
  ├─ Fix 4.1 getFinancialPosition real reconciliation
  └─ Fix 4.2 P&L vs retainedProfit cross-check
        │
        ▼
Batch 5 (cleanup — independent, any order)
  ├─ Fix 5.1 one shared formatter
  ├─ Fix 5.2 render topProducts.totalQty
  ├─ Fix 5.3 drop account.openingBalanceCents (REQUIRES MIGRATION)
  └─ Fix 5.4 filter depositCents > 0
```

Each batch can be shipped as a single PR. Batch 5 fixes can be cherry-picked
individually if desired.

---

## REGRESSION RISK SUMMARY

| Fix | Risk if applied wrong | Mitigation |
|---|---|---|
| 1.1 | Manual sales break if the `if` branch is wrong | The `if` only fires for `source='order' && orderId`; manual sales are unaffected. Test with both. |
| 1.2 | User can't archive accounts they intended to archive | The error message tells them to transfer the balance first; this is the correct workflow. |
| 1.3 | Dashboard total changes if callers aren't updated together | Update hook + both callers in the same commit. |
| 2.1 | Activity feed looks different (no more +1000 for draft orders) | This is the intended behavior per D2. Update the owner via SUMMARY_AR.md. |
| 2.2 | Activity feed shows fewer items when a range is selected | This is intended — the range should mean something. |
| 3.1-3.6 | P&L "sales" numbers change (lower in conversion month, includes deposits in deposit month) | This is the correct cash-basis behavior per D1. Owner must be briefed. |
| 3.2 | "Sales by source" labels change | Document in SUMMARY_AR.md. |
| 4.1 | Banner shows red when there's a real bug | That's the point — surface real errors instead of hiding them. |
| 5.3 | Requires migration + code in sync | See MIGRATIONS.md; deploy migration before code. |

---

## End of REMEDIATION_PLAN.md
