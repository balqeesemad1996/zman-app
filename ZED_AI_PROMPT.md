# Post-Implementation Verification Audit — Zman App Financial System (Full-Stack, Every Displayed Number)

## Your role
You (Zed AI) previously audited this system and produced the implementation plan for the deposit
lifecycle / liquidity-vs-profit fix. That fix has now been **implemented and deployed**. Your job
now is a **forensic post-implementation verification audit**: confirm the changes were implemented
correctly, then verify — layer by layer, end to end — that **every number the user sees anywhere in
the app is correct**, and hunt for any remaining problem that earlier passes missed.

This is a **read-only verification + report** pass. Do NOT modify code. Deliver findings + a
downloadable Markdown report.

## Repository & commit to audit
- Repo: `Qays7753/zman-app` (GitHub). **Audit exactly at commit `a8fde90` on branch `main`** (the
  post-fix HEAD). Confirm the HEAD you read matches this commit before starting.
- Deployable app under `artifacts/zman-app` (Next.js 15 App Router, Drizzle ORM, Postgres/Supabase).
- **Rely ONLY on the actual code + the model below.** Ignore any pre-existing audit/report markdown
  files in the repo — earlier AI models wrote them and may mislead you. The code is the truth.

---

## THE FIXED FINANCIAL MODEL (source of truth — every displayed number must obey this)

Simple aggregate cash box. Do NOT propose formal-accounting "improvements".

1. **Profit** = `realized_sales (sourceType='sale') − purchases − expenses`. Aggregate. No COGS,
   no inventory, no order-cost in finance.
2. **Two separate systems.** Financial system = truth. Orders system = tracking only; its
   *estimated* component costs NEVER enter finance. BUT what the customer actually pays (order
   price + `additionalProfitCents`, which is real earned income like design/consulting/service)
   IS real revenue and enters finance **at delivery**.
3. **Delivery is the only bridge.** `convertOrderToSale` records full realized revenue =
   `totalPriceCents + additionalProfitCents` as `sale`.
4. **Profit is cumulative.** Heavy-buying months legitimately show a loss. Never "fix" that.
5. **Liquidity vs Profit are separate.** Liquidity = all cash in hand right now (INCLUDES
   deposits, owner injections, opening). Profit EXCLUDES undelivered deposits (a deposit is a
   liability until delivered), owner injections/draws, opening, transfers.
6. **Deposit lifecycle.** Born at order creation (`sourceType='deposit'`, liquidity + liability,
   NOT profit). At delivery it TRANSFORMS: the deposit cash_movement is reclassified
   `sourceType` `deposit`→`sale`, `sourceId` `order.id`→`sale.id` (amount unchanged). After
   delivery: no active `deposit` movement for that order; profit now includes it as realized sale.

**What was implemented (verify each is actually in the code at `a8fde90`):**
- `convertOrderToSale` transforms the deposit movement + folds `additionalProfitCents` into
  `sale.amountCents = totalPrice + additionalProfit` + posts remainder = realized − deposit.
- `updateOrder` skips deposit-sync for delivered orders; blocks deposit edits on delivered orders;
  sale-sync uses realized revenue and preserves the transformed-deposit movement.
- `deleteOrder` / `updateOrderStatus` block delete/cancel of delivered orders.
- Dashboard `netProfit = actualSales − expenses − purchases` (deposits EXCLUDED); `sales =
  actualSales + deposits` kept for the liquidity tile. `getFinancialTrendData` and
  `getCurrentMonthNet` sum `'sale'` only.
- `reports/actions.ts computeCashBasisPnl` sums `'sale'` only; balance-sheet `retainedProfit`
  keeps `('sale','deposit')` minus deposit-liability (unchanged).
- IC-4 redefined to expect `totalPrice + additionalProfit`; IC-9/10/11 added; IC-8
  `+ activeDepositsCents` shim KEPT.
- migration `0014` reclassifies stale delivered-order deposits + adds CHECK constraints.

---

## PRIMARY MISSION — verify EVERY user-facing number is correct, across ALL layers

The owner's explicit concern: **"make sure every place that displays numbers to the user shows
everything correctly."** So for EVERY screen/component that renders a financial figure, trace the
number from the DB query → the server action/query function → the React component → the exact
value the user sees, and confirm it obeys the model.

### Enumerate and verify EVERY displayed-number surface, including (find any others yourself):
- **Dashboard** (`dashboard/components/DashboardClient.tsx` + `dashboard/queries.ts`): total cash /
  liquidity tile, "صافي هذا الشهر", "صافي التدفق النقدي", "السيولة المتاحة", "المشتريات المدفوعة",
  "المصاريف المدفوعة", owner-movement line, deposits-held, expected-remaining, top-expense
  categories, recent-activities amounts and signs, the trend chart series, order-status counts,
  upcoming deliveries amounts/deposits.
- **Reports** (`reports/actions.ts` + report components): cash-basis P&L, balance sheet
  (assets/liabilities/equity, retained profit), all downloadable report types, the integrity-check
  panel.
- **Finance tabs** (`finance/components/*Tab.tsx`): purchases/expenses/sales lists and totals,
  accounts balances + cash/bank subtotals, owner transactions net, opening balance display.
- **Orders** (`orders/components/*`): order form live summary (unit cost × qty, additional costs,
  additional profit, delivery, deposit, remaining, net), order detail estimated profit, order
  cards/list amounts.
- **Any other place** rendering a currency/number to the user.

### For each surface, confirm:
1. **Correct formula** per the model (profit excludes deposits; liquidity includes them; realized
   revenue = price + additionalProfit; costs from orders never leak into finance).
2. **Correct date basis** (`cashMovement.date` vs `createdAt` consistency; period vs point-in-time
   vs "current month" vs "all time" — and that each tile's time-scope label matches its query).
3. **Correct account filter** (`account.deletedAt IS NULL` where required; archived handling).
4. **Cross-surface agreement**: the same conceptual number (e.g. profit) must AGREE across
   dashboard, P&L, and balance sheet for the same period. Build a concrete numeric trace proving it.
5. **Sign / color correctness**: inflows +, outflows −, liabilities not shown as gains, etc.
6. **Label honesty**: the label must describe what the number actually is (profit vs cash-flow vs
   liquidity vs liability).

---

## CROSS-LAYER CONSISTENCY OF FINANCIAL & ACCOUNTING ACTIONS (owner's explicit priority)

Verify that **all layers stay consistent with each other for every financial/accounting action** —
this is a top priority. A single money action touches many layers; if any layer disagrees, the
numbers rot. For EACH financial action below, trace the FULL chain and prove every layer agrees:

`schema/DB constraints` → `Drizzle schema` (`db.ts`) → `Zod validation` (`schema.ts`) →
`server action` (`actions.ts`) → `cash_movement side-effects` → `query/read functions` →
`React-Query hooks + cache keys` → `component display` → `integrity checks (IC-1…IC-11)`.

Actions to trace end-to-end (find any others):
- **createOrder / updateOrder / deleteOrder / updateOrderStatus** — order + deposit cash_movement +
  (on delivery) sale + transformed deposit; verify every layer computes the SAME amounts and the
  cash_movement side-effects match what the read layer and ICs expect.
- **convertOrderToSale** — the whole realized-revenue chain (price + additionalProfit, deposit
  transform, remainder) is consistent from DB write to dashboard display to IC-4/IC-9.
- **createSale / updateSale / deleteSale** (manual sales) — amount, cash_movement, order-linked vs
  manual, soft-delete cash reversal.
- **createPurchase / updatePurchase / deletePurchase** and **expense** equivalents — cash out,
  reversal on delete/edit.
- **createOwnerTransaction (draw/inject)** — ownerTransaction row ↔ cash_movement amount/direction
  parity (IC-10), and that it stays OUT of profit but IN liquidity.
- **transferBetweenAccounts** — paired in/out equal amounts, net-zero to profit, both accounts
  updated.
- **saveOpeningBalance / lockOpeningBalance** — opening_balance row ↔ opening cash_movements sum
  (IC-11), capital reference-only.
- **createAccount / deleteAccount / archiveAccount** — balance rollups, archived/deleted handling
  across every read surface.

For each: confirm (a) the amount is computed identically in every layer, (b) cash_movement
side-effects exactly match, (c) soft-delete/reversal is symmetric (no orphaned or stale movements),
(d) the read/display layer and the integrity checks agree on the post-action state, (e) accounting
invariants hold (assets = liabilities + equity; ledger P&L = source-table P&L; liquidity =
opening + injections − draws + profit + transfer-net). Flag ANY layer that diverges.

## SECONDARY MISSION — layer integrity & regressions

- **Layer-by-layer soundness**: DB schema/constraints ↔ Drizzle schema ↔ query functions ↔ server
  actions ↔ hooks/React-Query ↔ components. Flag any mismatch (e.g. a column the code reads that
  the schema/migration doesn't guarantee, a hook caching a stale key, a query returning a shape the
  component mis-reads).
- **Did the fix introduce regressions?** Re-verify the "do NOT touch" formulas were NOT changed
  (`reports/actions.ts:745,768,793`; `integrityCheck.ts:180,516,621,671` shim). Re-verify the
  transform didn't break IC-1/IC-2/IC-5/IC-6/IC-7/IC-8.
- **Did the fix leave any half-done edge case?** e.g. price/additionalProfit edits on delivered
  orders, re-conversion after sale soft-delete, cancel/delete guards actually unreachable-safe.
- **Hunt for problems earlier passes did NOT read/cover.** Explicitly look beyond the deposit fix:
  transfers, owner draws/injections, opening balance, account archive/delete, sale/purchase/expense
  edit & delete cash-reversal, idempotency, optimistic-concurrency, timezone/date-boundary bugs,
  rounding, null-handling, any `sourceType` used inconsistently.
- **Confirm every item the owner asked for was actually done** (the "what was implemented" list
  above) — each with `file:line` proof of presence and correctness.

---

## METHOD — multiple agents + independent verifier (mandatory)

Run **several parallel sub-agents**, each owning a layer/surface, then an **independent Verifier**
that re-derives every critical claim from the actual code before anything is finalized. A wrong
financial "all good" is worse than a found bug. Suggested split:
- Agent 1: Dashboard surfaces (every tile) end-to-end.
- Agent 2: Reports + balance sheet + integrity-check panel end-to-end.
- Agent 3: Finance tabs + Orders surfaces end-to-end.
- Agent 4: Layer integrity + regression re-check of "do NOT touch" + cross-surface numeric
  agreement.
- Agent 5: Hunt for uncovered problems anywhere in the financial layer.
- Verifier: independently re-derives/refutes each agent's findings with `file:line` proof.

---

## DELIVERABLES (one downloadable Markdown file, one-click download)

Filename suggestion: `POST_FIX_VERIFICATION_REPORT.md`. Fully self-contained. Sections:
1. **Implementation confirmation** — each required change: CONFIRMED / PARTIAL / MISSING, with
   `file:line`.
2. **Per-surface number verification** — a table of EVERY user-facing number: surface, the exact
   formula in code (`file:line`), model-correct? (yes/no), date basis, and a verdict.
3. **Cross-surface agreement traces** — concrete numeric example(s) proving profit/liquidity agree
   across dashboard, P&L, balance sheet.
4. **Regressions & do-NOT-touch re-check** — confirm nothing that should stay was changed.
5. **New/uncovered problems** — anything earlier passes missed, ranked by severity, each with
   `file:line`, failure scenario, and whether it violates the model or is a genuine bug (distinguish
   intentional design from bug).
6. **Fix recommendations** — for each real problem, the correct fix consistent with the model (do
   NOT propose model violations).

## Hard constraints
- Read-only. Do not modify app source.
- Every claim cites `file:line`. Unverified claims are not allowed.
- Never propose a model violation (no COGS/inventory, no order costs in finance, don't "fix"
  cumulative losses, don't drop the IC-8 shim, keep liquidity≠profit separation).
- Distinguish "intentional design decision" from "actual bug"; when unsure, present it, don't assume.

## Self-check before finishing
Run a final Verifier pass over your own report confirming: every `file:line` is accurate at
`a8fde90`; every displayed-number surface was covered; cross-surface agreement is proven with real
numbers; no recommendation violates the model. Fix anything the Verifier flags before delivering.
