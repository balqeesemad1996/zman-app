# SOURCE OF TRUTH MAP — ZMAN Financial System

> Part 1: cross-page consistency table (Job C).
> Part 2: missing-but-important metrics call-outs (Job D).
>
> All citations are repo-relative `path:line` under `artifacts/zman-app/`.

---

## Part 1 — Cross-page consistency map

For every distinct business number that appears in more than one place, this
table names the ONE canonical query/formula, lists every render site, and
confirms whether each site is consistent. Sites flagged **DIVERGES** must be
fixed by the corresponding remediation batch.

### Number 1 — Total cash on hand (active accounts)

| Aspect | Value |
|---|---|
| **Canonical source** | `getAccountBalances(undefined, false)` returning active accounts; sum of `balanceCents` |
| **Canonical formula** | `Σ(in.amountCents − out.amountCents)` per active (`!isArchived`, `!deletedAt`) account, from `cash_movement` |
| **Canonical file:line** | `src/features/finance/actions.ts:1454-1509` (after Fix 1.3) |
| **Domain** | Finance (realized) |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| Dashboard "كاش الصندوق" + "رصيد البنك" (`DashboardClient.tsx:216-222, 539, 562`) | ⚠️ DIVERGES — uses client-side filter `!a.isArchived` on a server response that includes archived | ✅ Consistent after Fix 1.3 (server filters; client filter removed) |
| `/finance` AccountsTab per-account balance (`AccountsTab.tsx:181`) | ✅ Consistent (uses same source) | ✅ |
| `/reports` balance sheet `assets.cashCents` + `assets.bankCents` (`reports/actions.ts:515-525`) | ⚠️ DIVERGES — uses `isArchived=false` filter directly, bypasses `getAccountBalances` | ⚠️ Still diverges in code path but produces same value when no archived accounts have balance. After Fix 1.2 (refuse archive non-zero), the divergence is harmless. **[RECOMMENDATION]** refactor `getFinancialPosition` to call `getAccountBalances(asOfDate, false)` for consistency. |

### Number 2 — Net profit (period)

| Aspect | Value |
|---|---|
| **Canonical source** | `cash_movement` ledger, cash-basis |
| **Canonical formula** | `cash_in(sale+deposit, in, date IN range) − cash_out(expense+purchase, out, date IN range)` |
| **Canonical file:line** | `src/features/reports/actions.ts:318-444` (after Fix 3.1) and `src/features/dashboard/queries.ts:25-78` (after Fix 3.3) |
| **Domain** | Finance (realized) |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| Dashboard net card (`DashboardClient.tsx:225, 407`) | ⚠️ DIVERGES — uses `summary.netProfit` from `getFinancialSummary` which sums `sale.amountCents` (accrual) | ✅ Consistent after Fix 3.3 |
| `/reports` P&L net (`reports/page.tsx:279`) | ⚠️ DIVERGES — uses `data.pnl.netCents` from `getAllReportData` which sums `sale.amountCents` (accrual) | ✅ Consistent after Fix 3.1 |
| `/reports` downloaded P&L markdown (`reports/actions.ts:77, 92`) | ⚠️ DIVERGES — same accrual formula | ✅ Consistent after Fix 3.5 |

### Number 3 — Sales total (period)

| Aspect | Value |
|---|---|
| **Canonical source** | `cash_movement` ledger |
| **Canonical formula** | `Σ cash_movement.amountCents WHERE direction='in' AND sourceType IN ('sale','deposit') AND date IN range AND deletedAt IS NULL` |
| **Canonical file:line** | `reports/actions.ts:324` (after Fix 3.1) and `dashboard/queries.ts:30-41` (after Fix 3.3) |
| **Domain** | Finance (realized) |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| Dashboard "المبيعات" card (`DashboardClient.tsx:430`) | ⚠️ DIVERGES (accrual) | ✅ after Fix 3.3 |
| `/reports` P&L StatCard (`page.tsx:294`) | ⚠️ DIVERGES (accrual) | ✅ after Fix 3.1 |
| `/reports` expenses tab donut center (`page.tsx:378`) — uses `pnl.expensesCents` not sales | n/a (different number) | n/a |
| `/reports` sales tab per-source total (`page.tsx:444`) | ⚠️ DIVERGES (accrual, plus different grouping) | ✅ after Fix 3.2 |

### Number 4 — Deposits held (liability)

| Aspect | Value |
|---|---|
| **Canonical source** | `order` table |
| **Canonical formula** | `Σ order.depositCents WHERE deletedAt IS NULL AND status NOT IN ('delivered','cancelled')` |
| **Canonical file:line** | `dashboard/queries.ts:316-327` (`getCashSummary`) |
| **Domain** | Finance (liability) — but derived from Orders data |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| Dashboard "العربون بحوزتك" (`DashboardClient.tsx:585`) | ✅ Consistent | ✅ |
| `/reports` balance sheet `liabilities.depositsCents` (`reports/actions.ts:530-540`, `page.tsx:632`) | ⚠️ DIVERGES — adds `coalesce(depositDate, receivedDate) <= asOfDate` filter (correct for asOfDate semantics, but different from dashboard which has no date filter). When `asOfDate = today`, both produce the same value. | ✅ Consistent at `asOfDate = today`. For historical `asOfDate`, the balance sheet is more correct (excludes future deposits). |
| Dashboard "يشمل طلبات بعربون" sub-line (`DashboardClient.tsx:441`) | ⚠️ DIVERGES — different status filter (`<> 'cancelled'` only) and different date fallback (`createdAt` vs `receivedDate`) | ✅ after Fix 3.4 |

### Number 5 — Expected remaining (open orders)

| Aspect | Value |
|---|---|
| **Canonical source** | `order` table |
| **Canonical formula** | `Σ (order.totalPriceCents − order.depositCents) WHERE deletedAt IS NULL AND status NOT IN ('delivered','cancelled')` |
| **Canonical file:line** | `dashboard/queries.ts:319-327` (`getCashSummary`) |
| **Domain** | **Orders (expected)** — must NOT be summed into any Finance total |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| Dashboard "مبالغ متوقعة" (`DashboardClient.tsx:602`) | ✅ Consistent | ✅ |
| OrderDetail "remaining" (`OrderDetail.tsx:331`) — per-order, not summed | ✅ Consistent (per-order formula matches) | ✅ |
| OrderForm remaining preview (`OrderForm.tsx:124, 321, 398`) — per-order | ✅ Consistent | ✅ |

### Number 6 — Account balance (per-account)

| Aspect | Value |
|---|---|
| **Canonical source** | `cash_movement` ledger |
| **Canonical formula** | `Σ(in.amountCents) − Σ(out.amountCents) per accountId, WHERE deletedAt IS NULL [AND date <= asOfDate]` |
| **Canonical file:line** | `src/features/finance/actions.ts:1470-1503` |
| **Domain** | Finance (realized) |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| `/finance` AccountsTab per-account card (`AccountsTab.tsx:181`) | ✅ | ✅ |
| `/reports` balance sheet (sums across accounts, not per-account) | ✅ (same formula, aggregated) | ✅ |

### Number 7 — Order total (per-order)

| Aspect | Value |
|---|---|
| **Canonical source** | `order.totalPriceCents` column |
| **Canonical formula** | direct column (user input) |
| **Canonical file:line** | `src/features/orders/db.ts:24` |
| **Domain** | **Orders (expected)** — label as "قيمة الطلب" / "قيمة تقديرية", never "إيراد" |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| `/orders` OrderList (`OrderList.tsx:141`) | ✅ value; ⚠️ label unclear | ✅ after IA update |
| `/orders` OrderCalendar (`OrderCalendar.tsx:137`) | ✅ | ✅ |
| `/orders` OrderCard (`OrderCard.tsx:308`) | ✅ | ✅ |
| `/orders` OrderDetail (`OrderDetail.tsx:310`) | ✅ | ✅ |
| Dashboard upcoming orders (`DashboardClient.tsx:382`) | ⚠️ labeled implicitly as revenue (green `+`) — actually neutral expected | ✅ after Fix 2.1 |
| Dashboard activity feed order rows (`DashboardClient.tsx:742`) | ⚠️ DIVERGES — shows `+<totalPrice>` as revenue | ✅ after Fix 2.1 |
| `/reports` orders tab per-status total (`page.tsx:504`) | ✅ value; ⚠️ label "إجمالي القيمة التقديرية" (correct in download, check on-screen) | ✅ after IA update |
| `/reports` products tab revenue (`page.tsx:554`) | ⚠️ DIVERGES — labeled "إيرادات محققة" but includes non-delivered orders | ✅ after Fix 5.2 + IA update |

### Number 8 — Owner equity components

| Aspect | Value |
|---|---|
| **Canonical source** | `owner_transaction` table |
| **Canonical formula** | Injections: `Σ amountCents WHERE type='inject' AND deletedAt IS NULL AND date <= asOfDate`; Drawings: `Σ amountCents WHERE type='draw' AND ...` |
| **Canonical file:line** | `reports/actions.ts:567-595` |
| **Domain** | Finance (equity) |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| `/finance` OwnerTab per-row (`OwnerTab.tsx:144`) — shows individual transactions, not sums | ✅ | ✅ |
| `/reports` balance sheet equity block (`page.tsx:666, 672`) | ✅ | ✅ |
| **[GAP]** No "net owner investment" anywhere | ❌ Missing — see Job D #5 | ✅ after IA recommendation |

### Number 9 — Opening balance

| Aspect | Value |
|---|---|
| **Canonical source** | `cash_movement` ledger, `sourceType='opening'` |
| **Canonical formula** | `Σ amountCents WHERE sourceType='opening' AND direction='in' AND deletedAt IS NULL AND date <= asOfDate` |
| **Canonical file:line** | `reports/actions.ts:544-557` |
| **Domain** | Finance (equity) |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| `/finance` OpeningTab inputs (`OpeningTab.tsx:144-199`) — uses `openingBalance.cashCents`/`bankCents` columns (display only) | ⚠️ Different source (the `opening_balance` row, not the ledger), but values should match | ✅ after Fix 5.3 (drop dead `account.openingBalanceCents`; the `opening_balance` row stays as the user-input record, the ledger is the source of truth for aggregates) |
| `/reports` balance sheet `equity.openingCashInEquityCents` (`page.tsx:654`) | ✅ Uses ledger | ✅ |
| `/reports` balance sheet `equity.openingCapitalCents` reference display (`page.tsx:660`) | ✅ Uses `opening_balance.capitalCents` (reference only, correctly not summed) | ✅ |
| `account.openingBalanceCents` column | ⚠️ Dead data — written but never read | ✅ after Fix 5.3 (column dropped) |

### Number 10 — Profit margin %

| Aspect | Value |
|---|---|
| **Canonical source** | derived from net profit and sales |
| **Canonical formula** | `(net / salesCents) * 100` |
| **Canonical file:line** | `reports/page.tsx:285` |
| **Domain** | Finance (derived) |

| Render site | Currently consistent? | After fix? |
|---|---|---|
| `/reports` P&L header sub-line (`page.tsx:285`) | ⚠️ Uses accrual `salesCents` (so margin is wrong relative to actual cash) | ✅ after Fix 3.1 (inherits correct cash-basis sales) |

---

## Part 2 — Missing-but-important metrics (Job D)

Acting as an advisor to a small-business owner, these are the high-value
numbers NOT currently shown anywhere that should be added. Each is constrained
to: cash-basis only, no inventory, no accruals, queryable from existing tables.

### Missing Metric 1 — "صافي تعاملات المالك" (Net Owner Investment)

**What:** the net amount the owner has personally put into the business (injections
minus drawings), as of now.

**Why it matters:** the owner wants to know "how much of my own money is in
this business right now?" This is the single most important equity number for
a small-business owner, and it's currently scattered (visible only as a list of
individual transactions in `/finance` owner tab, with no sum).

**Where it belongs:**
- `/finance` owner tab footer (immediate, every time the owner visits)
- `/reports` balance sheet equity block (as a sub-line under "إيداعات" and "مسحوبات", showing the net)

**Exact source query (existing tables):**
```sql
SELECT
  COALESCE(SUM(CASE WHEN type = 'inject' THEN amount_cents ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN type = 'draw' THEN amount_cents ELSE 0 END), 0) AS net_owner_investment_cents
FROM owner_transaction
WHERE deleted_at IS NULL;
```

Drizzle equivalent:
```ts
const [row] = await db
  .select({
    net: sql<number>`coalesce(sum(case when ${ownerTransaction.type} = 'inject' then ${ownerTransaction.amountCents} else 0 end), 0)
      - coalesce(sum(case when ${ownerTransaction.type} = 'draw' then ${ownerTransaction.amountCents} else 0 end), 0)`,
  })
  .from(ownerTransaction)
  .where(isNull(ownerTransaction.deletedAt));
```

**Domain:** Finance (equity).

---

### Missing Metric 2 — "صافي التدفق النقدي اليومي" (Daily Net Cash Flow trend, last 30 days)

**What:** a small sparkline showing `cash_in − cash_out` per day for the last
30 days.

**Why it matters:** the dashboard currently shows a net-profit trend
(`DashboardClient.tsx:231-250`) but it's based on the (currently accrual) sales
trend. After Fix 3.6 it becomes cash-basis — but it still only shows the
*operating* flow (sales/expenses/purchases). The owner also wants to see the
*total* cash flow including owner injections, owner draws, and transfers in/out
of the operating accounts.

**Where it belongs:** Dashboard, between Section 1.1 (cash position) and
Section 1.2 (period summary). A wide, short sparkline.

**Exact source query (existing tables):**
```sql
SELECT
  date,
  SUM(CASE WHEN direction = 'in' THEN amount_cents ELSE 0 END)
  - SUM(CASE WHEN direction = 'out' THEN amount_cents ELSE 0 END) AS net_cents
FROM cash_movement
WHERE deleted_at IS NULL
  AND date >= CURRENT_DATE - INTERVAL '29 days'
  AND date <= CURRENT_DATE
GROUP BY date
ORDER BY date;
```

Filter to operating accounts only (exclude archived):
```sql
-- add to WHERE:
AND account_id IN (SELECT id FROM account WHERE deleted_at IS NULL AND is_archived = false)
```

**Domain:** Finance (realized).

---

### Missing Metric 3 — "أكبر فئات المصاريف هذا الشهر" (Top Expense Categories This Month)

**What:** a small list of the top 3 expense categories by amount this month,
with their share of total expenses.

**Why it matters:** the owner wants to know "where is my money going?" The
`/reports` expenses tab shows this for any selected range, but the dashboard
doesn't surface it. A monthly top-3 on the dashboard drives faster decisions
("rent is too high", "marketing is paying off").

**Where it belongs:** Dashboard, after the period summary section. A compact
3-row list.

**Exact source query (existing tables):**
```sql
SELECT category, SUM(amount_cents) AS total_cents, COUNT(*) AS count
FROM expense
WHERE deleted_at IS NULL
  AND date >= date_trunc('month', CURRENT_DATE)::date
  AND date <= (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
GROUP BY category
ORDER BY total_cents DESC
LIMIT 3;
```

**Domain:** Finance (realized).

---

### Missing Metric 4 — "صافي الثروة الحالي" (Current Net Worth)

**What:** total assets minus total liabilities = the owner's current net worth
in the business.

**Why it matters:** this is THE bottom-line number for a small-business owner:
"if I wound everything down today, what would I walk away with?" It's currently
computable only by mentally subtracting the balance sheet's liabilities from
assets, which most owners won't do.

**Where it belongs:**
- Dashboard Section 1.1 hero, as a sub-line under "إجمالي النقد المتاح" (when
  deposits-held > 0, show "منها X د.أ عربونات كالتزام")
- `/reports` balance sheet, as a headline number above the three columns

**Exact source query (existing tables):**
```sql
-- assets
SELECT
  COALESCE(SUM(CASE WHEN direction = 'in' THEN amount_cents ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN direction = 'out' THEN amount_cents ELSE 0 END), 0) AS assets_cents
FROM cash_movement cm
INNER JOIN account a ON cm.account_id = a.id
WHERE cm.deleted_at IS NULL AND a.deleted_at IS NULL AND a.is_archived = false;

-- liabilities
SELECT COALESCE(SUM(deposit_cents), 0) AS liabilities_cents
FROM "order"
WHERE deleted_at IS NULL AND status NOT IN ('delivered', 'cancelled');

-- net worth = assets - liabilities
```

**Domain:** Finance (realized minus liability).

---

### Missing Metric 5 — "النقد الحر" (Free Cash = Cash − Deposits Held)

**What:** cash on hand minus deposits held as liabilities. This is the cash
the owner can safely spend without risking money they owe back to customers.

**Why it matters:** a owner who sees "1,000 JOD cash" and forgets they're
holding 300 JOD in customer deposits will overspend. The current dashboard
shows both numbers in separate cards but doesn't compute the difference.

**Where it belongs:** Dashboard Section 1.1 hero, as the primary headline
(replacing "إجمالي النقد المتاح"). Sub-line: "منها X د.أ عربونات كالتزام".

**Exact source query (existing tables):** combine Numbers 1 and 4:
```sql
-- free_cash = (Σ cash_movement in−out for active accounts) − (Σ order.depositCents for non-delivered, non-cancelled)
```

**Domain:** Finance (realized, net of liability).

---

### Missing Metric 6 — "تسوية شهرية" (Month-over-Month Reconciliation)

**What:** a small table showing, for the last 3 months:
- Cash at start of month
- Cash in (operating)
- Cash out (operating)
- Net
- Cash at end of month

**Why it matters:** this is the simplest possible monthly trend. The owner can
see "am I growing, flat, or declining?" Currently the dashboard only shows the
selected period's net, with no comparison to prior months.

**Where it belongs:** `/reports` P&L tab, below the main summary, as a 3-row
table.

**Exact source query (existing tables):**
```sql
-- For each of the last 3 months:
-- cash_start = Σ(in−out) WHERE date < month_start
-- cash_in = Σ(in) WHERE sourceType IN ('sale','deposit','owner_inject') AND date IN month
-- cash_out = Σ(out) WHERE sourceType IN ('expense','purchase','owner_draw') AND date IN month
-- cash_end = cash_start + cash_in - cash_out
```

**Domain:** Finance (realized).

---

### Missing Metric 7 — "نسبة المصاريف إلى المبيعات" (Expense Ratio)

**What:** `expenses / sales * 100` for the selected period.

**Why it matters:** the P&L shows expenses as an absolute number, but the ratio
to sales is more informative. "Expenses are 500 JOD" means nothing; "expenses
are 80% of sales" means "I'm running on thin margins".

**Where it belongs:** `/reports` P&L tab, next to the profit margin %.

**Exact source query (existing tables):** derived from existing P&L fields:
```ts
const expenseRatio = salesCents > 0 ? (expensesCents / salesCents) * 100 : 0;
```

**Domain:** Finance (derived).

---

## Part 3 — What is INTENTIONALLY NOT proposed

Per the constraints (D3: no inventory; cash-basis only; no accruals):

| Not proposed | Why |
|---|---|
| Inventory / stock levels | D3 — out of scope |
| COGS by inventory valuation | D3 — purchases are immediate cash-out |
| Per-item stock tracking | D3 |
| Accounts receivable ledger | Cash-basis — no receivables |
| Accounts payable ledger | Cash-basis — no payables |
| Depreciation | Cash-basis — no non-cash expenses |
| Accruals / prepayments | Cash-basis — explicitly excluded |
| Multi-currency | Out of scope — JOD only |
| Tax calculations | Out of scope — owner handles externally |
| Payroll module | Out of scope — expenses cover salaries |
| Invoicing (separate from orders) | The order IS the invoice in this workshop model |

These are deliberate, documented limitations. If the business grows, they can
be revisited — but for now, simplicity wins.

---

## End of SOURCE_OF_TRUTH_MAP.md
