# INFORMATION ARCHITECTURE — ZMAN Financial System

> Target layout for the whole app, treating it as ONE system. Page-by-page.
> For each page: purpose, audience moment, ordered sections, exact numbers per
> section, source, and domain (Finance = realized cash / Orders = expected).
>
> Includes the Finance-vs-Orders separation rule, an explicit "what moved and
> why" list vs. current layout, and professional opinions (marked
> **[RECOMMENDATION]** or **[STRONG RECOMMENDATION]**).

## The Prime Rule (governs every decision below)

> **Finance numbers and Orders numbers must NEVER be summed together, NEVER
> share a total, and NEVER appear in the same color/visual treatment on the
> same card.**

Concrete enforcement:

| Aspect | Finance domain (realized cash) | Orders domain (expected/operational) |
|---|---|---|
| Source | `cash_movement` ledger | `order` table |
| Label vocabulary | "نقدي"، "مُحصَّل"، "مدفوع"، "صافي" | "متوقّع"، "تقديري"، "قيمة الطلب"، "متبقٍّ" |
| Visual treatment | `text-info` (green/blue) for cash-in, `text-alert` (red) for cash-out | `text-ink-2` (neutral gray) — never green/red |
| Sign convention | `+` for cash-in, `−` for cash-out | No sign — these are estimates, not flows |
| Where they live | Dashboard "الملخص النقدي", `/finance` tabs, `/reports` P&L + balance sheet | Dashboard "الطلبات القادمة", `/orders` pages, `/reports` orders tab + products tab |
| May be summed into P&L? | YES (the P&L is built from these) | **NEVER** |
| May be summed into balance sheet? | YES (assets = Σ cash, liabilities = deposits held) | **NEVER** (only the deposit, once posted to the ledger, becomes a finance number) |

The **only bridge** between the two domains is the cash ledger:
- Customer pays a deposit → `cash_movement(sourceType='deposit')` (Finance number) + `order.depositCents` (Orders number, but it's also visible in Finance as a liability until delivery).
- Order converted to sale → `cash_movement(sourceType='sale', amount=remainder)` (Finance number) + `order.status='delivered'` (Orders status).

Once the deposit is in the ledger, it's a Finance number. The Orders domain keeps the
`order.depositCents` column for display, but it must NOT be re-summed into any finance
total — it's already there via the ledger.

---

## Page 1 — Home Dashboard (`/`)

### Purpose
The owner's daily 30-second answer to: "where does my business stand right now,
and what needs my attention today?"

### Audience moment
Morning. Coffee in hand. Wants to see (in this order):
1. Cash on hand right now.
2. This period: money in vs money out, net.
3. Customer deposits I'm holding (money I owe back if I cancel).
4. Orders I need to deliver this week.
5. Recent activity (who paid me, what I spent).

### Target layout (top to bottom, reading order)

#### Section 1.1 — "الوضع النقدي الحالي" (Current Cash Position) — **[STRONG RECOMMENDATION] NEW SECTION**

This is the single most important number for a small-business owner and it's
**currently missing as a standalone headline**. Today the dashboard buries it
inside the "الملخص النقدي" grid (4 small cards). It deserves the top.

**Layout:** one large hero card spanning full width.

| Field | Source | Formula | Domain |
|---|---|---|---|
| **إجمالي النقد المتاح (صندوق + بنك)** | `getAccountBalances()` filtered to `!isArchived` | `Σ balanceCents` across all active cash + bank accounts | Finance (realized) |
| Sub: صندوق | same | `Σ balanceCents` for `type='cash'` | Finance |
| Sub: بنك | same | `Σ balanceCents` for `type='bank'` | Finance |

**Why top:** the owner needs to know "can I pay my bills this week?" before
anything else. The current dashboard puts "net profit" first, which is a
period-aggregate — useful, but secondary to the live cash position.

#### Section 1.2 — "ملخص الفترة" (Period Summary) — current layout, redefined

**Layout:** 4-card grid (was 5 including "net profit" floating above; now
consistent grid).

The currently-floating "صافي التدفق النقدي" card merges into this grid as the
4th card. The "التقارير" link-card is removed (it's available in the nav).

| Card | Source | Formula | Domain |
|---|---|---|---|
| **صافي التدفق النقدي (الربح)** | `getFinancialSummary(start, end)` (after Fix 3.3) | `sales − expenses − purchases` (cash-basis) | Finance |
| **المبيعات المُحصَّلة** | same | `Σ cash_movement.amountCents WHERE direction='in' AND sourceType IN ('sale','deposit') AND date IN range` | Finance |
| **المصاريف المدفوعة** | same | `Σ expense.amountCents WHERE date IN range` | Finance |
| **المشتريات المدفوعة** | same | `Σ purchase.totalCents WHERE date IN range` | Finance |

**Visual treatment:** net profit card uses `text-info` if ≥0, `text-alert` if
<0. The three component cards use `text-info` for sales, `text-alert` for
expenses/purchases. **No sign prefixes on the component cards** (they're
magnitudes, not flows); the net card has `+`/`−`.

**[RECOMMENDATION]** Remove the "يشمل طلبات بعربون" sub-line currently under
the sales card (`DashboardClient.tsx:435-443`). After Fix 3.3, deposits are
already included in `salesCents` — the sub-line is redundant. The deposit
amount belongs in the balance sheet / cash-position section as a liability,
not as a footnote to revenue.

#### Section 1.3 — "الالتزامات والعربونات" (Obligations & Deposits Held) — redefined

**Layout:** 2-card grid. These are Finance-domain numbers that represent money
the owner is holding but doesn't fully "own" yet.

| Card | Source | Formula | Domain |
|---|---|---|---|
| **عربونات بحوزتك (التزام)** | `getCashSummary()` | `Σ order.depositCents WHERE status NOT IN ('delivered','cancelled')` | Finance (liability) |
| **مبالغ متوقعة (متبقّي الطلبات)** | `getCashSummary()` | `Σ (order.totalPriceCents − order.depositCents) WHERE status NOT IN ('delivered','cancelled')` | **Orders (expected)** |

**Visual treatment for the "expected" card:** `text-ink-2` (neutral gray), with
a "متوقّع" badge. **[STRONG RECOMMENDATION]** This is the single most
important visual cue — without it, the owner will mentally add the expected
remaining to the cash on hand and over-spend. The current code at
`DashboardClient.tsx:594-608` uses `text-ink-2` already ✅ — keep it, and add
the "متوقّع" badge explicitly.

#### Section 1.4 — "طلبات يستحق تسليمها" (Orders Due for Delivery) — unchanged

**Layout:** full-width card. This is the operational pipeline.

| Field | Source | Domain |
|---|---|---|
| Header count | `stats.upcomingOrders.length` | Orders |
| Per-order: customer, product, delivery date | `stats.upcomingOrders` | Orders |
| Per-order: `totalPriceCents` | `order.totalPriceCents` | **Orders (expected)** — label as "قيمة الطلب" not "إيراد" |

**[RECOMMENDATION]** Add a "العربون المُحصَّل" sub-line per order showing
`order.depositCents` — the only Finance number on this card. This reminds the
owner which orders are pre-paid and which aren't.

#### Section 1.5 — "حالة الطلبات التشغيلية" (Operational Order Status) — unchanged

**Layout:** 5-segment grid (draft/sent/confirmed/delivered/cancelled).

| Field | Source | Domain |
|---|---|---|
| Count per status | `stats.ordersByStatus` (after Fix 2.3, filtered by selected range) | Orders |

No money shown here — counts only. **[RECOMMENDATION]** Remove any temptation
to add "total value per status" here; that belongs in `/reports` orders tab
where it can be clearly labeled as "قيمة تقديرية".

#### Section 1.6 — "آخر النشاطات" (Recent Activity) — redefined per Fix 2.1

**Layout:** full-width list. After Fix 2.1 + 2.2, this honors the selected
date range and treats order rows correctly.

| Activity type | Display | Domain |
|---|---|---|
| `sale` | `+<amount>` green | Finance (realized cash-in) |
| `expense` | `−<amount>` red | Finance (realized cash-out) |
| `purchase` | `−<amount>` red | Finance (realized cash-out) |
| `order` (with deposit) | `+<depositAmount>` green, title shows total order value | Mixed: the deposit is Finance, the total is Orders (clearly labeled in title) |
| `order` (no deposit) | "بدون أثر نقدي" neutral gray | Orders |

### What MOVED on this page (vs. current)

| Element | Current | Target | Why |
|---|---|---|---|
| Hero (top) | "طلبات يستحق تسليمها" (operational) | "الوضع النقدي الحالي" (cash position) | Owner needs cash answer first, not operational pipeline |
| Net profit card | Floating separately above the grid | Inside the 4-card "ملخص الفترة" grid | Cleaner visual hierarchy |
| "التقارير" link-card | Takes 1 of 5 grid slots | Removed (in nav) | Free up space for cash position hero |
| "يشمل طلبات بعربون" sub-line | Under sales card | Removed | Deposits are already in `salesCents` after Fix 3.3; redundant |
| "مبالغ متوقعة" card | `text-ink-2` (already neutral) | Add explicit "متوقّع" badge | Reinforce the Finance-vs-Orders separation |
| Activity feed: order rows | `+<totalPrice>` green (looks like revenue) | Neutral unless deposit paid; title carries total | D2: orders are not revenue |
| Activity feed date range | Ignored | Filtered by selected range | D2: range should mean something |
| Orders-by-status panel | All-time counts | Range-filtered | Consistency with `/reports` orders tab |

---

## Page 2 — `/finance` (Finance module)

### Purpose
The owner's "operational cash register": record what came in and what went
out, manage accounts, manage owner equity, manage opening balances.

### Audience moment
Multiple times per day, whenever a transaction happens.

### Tab structure (unchanged 6 tabs, but redefine what each is FOR)

The 6 tabs at `FinanceClient.tsx:92-99` stay. Their purposes:

| Tab | Purpose | Domain |
|---|---|---|
| purchases | Record cash spent on materials | Finance (cash-out) |
| expenses | Record cash spent on operations | Finance (cash-out) |
| sales | Record cash received from sales (manual + converted) | Finance (cash-in) |
| accounts | Manage cash/bank accounts + transfers | Finance (cash position) |
| owner | Record owner draws/injections | Finance (equity) |
| opening | One-time opening balance setup | Finance (equity) |

### Section definitions per tab

#### Tab 2.1 — `purchases`
- Header: "المشتريات (مدفوعات المواد)"
- List of purchase cards, each showing: item, supplier, `quantity × unitCost`, `totalCents`, date, notes.
- **No totals** at the list level (the dashboard and P&L own the totals).
- **[RECOMMENDATION]** Add a small footer "إجمالي معروض: X" showing the sum of
  currently-loaded items (not all-time) — helps the owner scan a page of
  purchases. Source: client-side sum of loaded items.

#### Tab 2.2 — `expenses`
- Header: "المصاريف (مدفوعات التشغيل)"
- List of expense cards: category, `amountCents`, date, description.
- Filter by category (existing).
- Same footer recommendation as purchases.

#### Tab 2.3 — `sales`
- Header: "المبيعات (مقبوضات نقدية)"
- List of sale cards: description, `amountCents`, source badge (manual/order), date.
- **[STRONG RECOMMENDATION]** The displayed `amountCents` for an order-source
  sale is the FULL order price (per `convertOrderToSale:1034`). This is
  misleading — the user might think they received that amount in cash today.
  Add a sub-line: "منها عربون مُحصَّل سابقاً: `<depositCents>` · المتبقي
  المُرحَّل للصندوق: `<amountCents - depositCents>`". This requires the sales
  query at `queries.ts:172-221` to join `order.depositCents` for
  `source='order'` rows.
- Same footer recommendation.

#### Tab 2.4 — `accounts`
- Header: "الحسابات النقدية والبنكية"
- Grid of account cards: name, type badge, **current balance** (`balanceCents`),
  archive/delete actions.
- Archived accounts shown dimmed (current behavior, correct after Fix 1.2 +
  1.3).
- **[RECOMMENDATION]** Add a "إجمالي الصناديق النشطة" footer = Σ active cash
  accounts. And "إجمالي البنوك النشطة" footer = Σ active bank accounts. These
  are the same numbers as the dashboard hero, providing a cross-check.
- The "transfer between accounts" modal stays (current behavior correct).

#### Tab 2.5 — `owner`
- Header: "سحوبات وإيداعات المالك (حقوق الملكية)"
- Table: date, type (draw/inject), `amountCents`, linked account, reason.
- **[RECOMMENDATION]** Add a "صافى تعاملات المالك" footer = `Σ injections − Σ drawings`. This tells the owner how much they've personally put in vs taken out.

#### Tab 2.6 — `opening`
- Header: "الأرصدة الافتتاحية للورشة"
- Form: `goLiveDate`, `cash`, `bank`, `capital` (with the existing
  `cash + bank = capital` check at `OpeningTab.tsx:46`).
- Lock state badge.
- No changes needed — this tab is correct as-is.

### What MOVED on this page (vs. current)

| Element | Current | Target | Why |
|---|---|---|---|
| Sales card display | Just `amountCents` (full price) | Add sub-line breaking down deposit vs remainder | Owner needs to see what actually landed in cash today vs what was already collected |
| Accounts tab totals | None | Add "إجمالي الصناديق النشطة" + "إجمالي البنوك النشطة" footers | Cross-check with dashboard hero |
| Owner tab totals | None | Add "صافي تعاملات المالك" footer | Owner wants to see net personal investment |

---

## Page 3 — `/reports` (Reports & Balance Sheet)

### Purpose
The owner's periodic review (weekly/monthly): "how did I do this period, and
what's my financial position?"

### Audience moment
Weekly or monthly review. Slower, more deliberate than the dashboard.

### Section structure (two top-level sections, current, unchanged)

```
/reports
├── analytics (التقارير)
│   ├── pnl (الأرباح والخسائر)
│   ├── expenses (المصاريف)
│   ├── sales (المبيعات)
│   ├── orders (الطلبات) ← ORDERS DOMAIN
│   └── products (المنتجات) ← ORDERS DOMAIN
└── balance_sheet (الوضع المالي)
```

**[STRONG RECOMMENDATION]** The `orders` and `products` sub-tabs are
**Orders-domain** (they show estimates from the `order` table, not realized
cash). They should be **visually separated** from the first three Finance-domain
tabs. Two options:

- **Option A (preferred):** Add a second-level divider in the segmented
  control: "تقارير مالية" (pnl, expenses, sales) | "تقارير تشغيلية" (orders,
  products). Two groups, visually distinct.
- **Option B:** Move orders/products to a separate `/reports/operations` page.

Option A is simpler (no routing change). Recommend A.

#### Section 3.1 — P&L (`pnl` sub-tab) — Finance domain

After Fix 3.1 + 3.5, all numbers are cash-basis from `cash_movement`.

| Field | Source | Formula | Domain |
|---|---|---|---|
| صافي الأرباح/الخسائر | `data.pnl.netCents` | `salesCents − purchasesCents − expensesCents` (cash-basis) | Finance |
| هامش الربح % | derived | `(net / salesCents) * 100` | Finance |
| إجمالي المبيعات | `data.pnl.salesCents` | `Σ cash_movement(sale+deposit, in)` | Finance |
| إجمالي المشتريات | `data.pnl.purchasesCents` | `Σ purchase.totalCents` | Finance |
| إجمالي المصاريف | `data.pnl.expensesCents` | `Σ expense.amountCents` | Finance |

**[RECOMMENDATION]** Add a one-line "أساس نقدي" badge at the top of the P&L
section: "هذا التقرير يعتمد الأساس النقدي: الإيراد يُحتسب عند التحصيل
الفعلي، والمصروف عند الدفع الفعلي." This sets expectations and prevents
confusion when an order converted today (full price in old code) shows less
revenue than expected (only the remainder in new code).

#### Section 3.2 — Expenses by Category (`expenses` sub-tab) — Finance domain

Unchanged. Donut + legend with per-category `totalCents`, `count`, `pct`.

#### Section 3.3 — Sales by Source (`sales` sub-tab) — Finance domain

After Fix 3.2, the split is by `sourceType` (`deposit` vs `sale`), not by
`sale.source` (`manual` vs `order`).

| Field | Source | Domain |
|---|---|---|
| Per-source total | `src.totalCents` | Finance |
| Per-source count | `src.count` | Finance |
| Per-source pct | `src.pct` | Finance |
| Source labels | "عربونات طلبات (دُفعت مقدماً)" / "تسويات مبيعات (متبقّي مُحصَّل)" | Finance |

**[RECOMMENDATION]** Add a donut here too (currently only the expenses tab has
a donut). Visual consistency.

#### Section 3.4 — Orders by Status (`orders` sub-tab) — **Orders domain**

| Field | Source | Formula | Domain |
|---|---|---|---|
| Per-status count | `row.count` | `COUNT(order.id) GROUP BY status` | Orders |
| Per-status total value | `row.totalCents` | `SUM(order.totalPriceCents) GROUP BY status` | **Orders (expected)** |
| Per-status pct | `row.pct` | count-based | Orders |

**[STRONG RECOMMENDATION]** Rename the column header from "إجمالي القيمة
التقديرية" (already correct in the markdown download at
`reports/actions.ts:219`) to ensure the on-screen label also says "قيمة
تقديرية" not "إيراد". And add a section-level badge: "أرقام تقديرية — لا
تُمثّل نقداً مُحصَّلاً".

#### Section 3.5 — Top Products (`products` sub-tab) — **Orders domain**

After Fix 5.2, shows `orderCount`, `totalQty`, and `revenueCents` (labeled as
"قيمة تقديرية").

**[STRONG RECOMMENDATION]** Rename the section from "أكثر المنتجات طلباً" to
"أكثر المنتجات طلباً (قيمة تقديرية)". The current label implies revenue; the
query at `reports/actions.ts:361-367` sums `order.totalPriceCents` which
includes draft/sent/confirmed orders whose revenue is NOT realized.

#### Section 3.6 — Balance Sheet (`balance_sheet` section) — Finance domain

After Fix 4.1, the "balanced" banner reflects a real check.

| Block | Field | Source | Domain |
|---|---|---|---|
| Assets | نقدية الصندوق | `Σ(in−out)` for active cash accounts | Finance |
| Assets | أرصدة البنك | `Σ(in−out)` for active bank accounts | Finance |
| Assets | إجمالي الأصول | cashCents + bankCents | Finance |
| Liabilities | عربونات مؤجلة | `Σ order.depositCents WHERE status NOT IN ('delivered','cancelled')` | Finance (liability) |
| Liabilities | إجمالي الالتزامات | = depositsCents | Finance |
| Equity | نقدية البداية | `Σ cash_movement(opening, in)` | Finance |
| Equity | رأس المال المصرح به (مرجعي) | `openingBalance.capitalCents` | **Reference only — not summed** |
| Equity | إيداعات المالك | `Σ owner_transaction(inject)` | Finance |
| Equity | مسحوبات المالك | `Σ owner_transaction(draw)` | Finance |
| Equity | أرباح محتجزة | `salesCashIn − depositsLiability − cashOut` | Finance |
| Equity | إجمالي حقوق الملكية | sum of above | Finance |
| Reconciliation | banner | green if `equityDriftCents == 0`, red otherwise | Finance |

**[RECOMMENDATION]** Add a "تسوية مع P&L" detail row (collapsed by default):
"P&L الصافي (كل الفترات): X · الأرباح المحتجزة + العربونات كالتزام: Y ·
الفرق: 0". This is the Fix 4.2 cross-check made visible.

### What MOVED on this page (vs. current)

| Element | Current | Target | Why |
|---|---|---|---|
| P&L "sales" definition | `Σ sale.amountCents` (accrual) | `Σ cash_movement(sale+deposit, in)` (cash) | D1 |
| Sales-by-source split | `manual` vs `order` | `deposit` vs `sale` (cash sourceType) | D1: meaningful cash split |
| Orders/products tabs labeling | Implied revenue | Explicit "قيمة تقديرية" badge + section header | D2: prevent confusion |
| Section grouping | 5 flat tabs | 2 groups: "مالية" (3) + "تشغيلية" (2) | D2: structural separation |
| Balance check | Always green (tautology) | Green/red based on real equity drift | D5 |
| P&L reconciliation | None | Visible "تسوية مع P&L" detail row | Trust through transparency |

---

## Page 4 — `/orders` (Orders module — operational)

### Purpose
The operational pipeline: track orders from draft to delivery.

### Audience moment
Throughout the day, whenever an order status changes.

### Out of audit scope (not in the original audit surface), but for completeness:

| Field | Source | Domain |
|---|---|---|
| Order list: `totalPriceCents` | `order.totalPriceCents` | Orders (expected) — label "قيمة الطلب" |
| Order list: `depositCents` | `order.depositCents` | Orders (expected) — but the corresponding cash_movement IS Finance |
| Order list: remaining | `totalPriceCents − depositCents` | Orders (expected) — label "متبقّي يُحصَّل عند التسليم" |
| Order detail: estimated profit | `totalPriceCents − totalCostCents` | Orders (expected) — label "ربح متوقّع" |
| Order form: net profit preview | `totalPrice − totalCost` | Orders (expected) |

**[STRONG RECOMMENDATION]** Every monetary field on the orders pages must
carry an "متوقّع" or "تقديري" label. Currently the OrderForm at
`OrderForm.tsx:421` labels the net profit as "صافي الربح" — this should be
"الربح المتوقّع" to avoid confusion with the Finance-domain "صافي الربح" in
the P&L.

---

## Page 5 — `/catalog` (Catalog management)

### Purpose
Manage the catalog of products and components with default costs.

### Out of audit scope. No changes recommended. The `defaultCostCents` field is
a reference value, not a transaction. No Finance/Orders concern.

---

## Cross-page consistency rules (enforced by Fix batches)

1. **"Cash on hand" appears in 3 places** — they MUST all reconcile:
   - Dashboard Section 1.1 hero (new): `Σ getAccountBalances(!isArchived)`
   - `/finance` accounts tab footer (new): same source, same filter
   - `/reports` balance sheet `assets.totalCents` (with `asOfDate=today`): same source
   - **All three use the same `getAccountBalances()` call.** After Fix 1.3,
     this is enforced server-side.

2. **"Net profit" appears in 2 places** — they MUST match:
   - Dashboard Section 1.2 net card: `summary.netProfit` from `getFinancialSummary`
   - `/reports` P&L `data.pnl.netCents` from `getAllReportData`
   - **Both use cash-basis `cash_movement` after Fix 3.1 + 3.3.** Same source,
     same formula.

3. **"Deposits held" appears in 3 places** — they MUST reconcile:
   - Dashboard Section 1.3 "عربونات بحوزتك": `getCashSummary().depositsHeldCents`
   - `/reports` balance sheet `liabilities.depositsCents` (with `asOfDate=today`)
   - (Implicit) the sum of `cash_movement(sourceType='deposit', direction='in')` for orders not yet delivered
   - **The first two use `order.depositCents` summed by status; the third is
     the ledger equivalent.** They should match when no delivered/cancelled
     order still has a deposit movement (which is enforced by
     `updateOrderStatus→'cancelled'` zeroing the deposit at
     `orders/actions.ts:544` and soft-deleting the movement at :586-598).

4. **"Order total" appears in 4 places** — they MUST all read `order.totalPriceCents`:
   - `/orders` list and detail
   - `/reports` orders tab and products tab
   - Dashboard upcoming-orders panel
   - Dashboard activity feed (in the title, not as the amount, after Fix 2.1)
   - **All labeled "قيمة تقديرية" or "قيمة الطلب" — never "إيراد".**

---

## End of INFORMATION_ARCHITECTURE.md
