# ROUND 3 — Full Correctness & Single-Source-of-Truth Audit

This document records the database orphan sweep queries and results, maps every displayed monetary figure in the application to its canonical database query, and flags any source anomalies or divergences with recommended fixes.

---

## 1. Database Orphan & Integrity Sweep

The following queries were executed on the live database on July 8, 2026, to verify the complete reconciliation of source rows and ledger movements.

### 1a. Active purchase with no active matching cash_movement
*   **Query:**
    ```sql
    SELECT p.id, p.item, p.total_cents
    FROM purchase p
    LEFT JOIN cash_movement cm ON cm.source_type = 'purchase' AND cm.source_id = p.id AND cm.deleted_at IS NULL
    WHERE p.deleted_at IS NULL AND cm.id IS NULL;
    ```
*   **Current Count:** 0

### 1b. Active expense with no active matching cash_movement
*   **Query:**
    ```sql
    SELECT e.id, e.category, e.amount_cents
    FROM expense e
    LEFT JOIN cash_movement cm ON cm.source_type = 'expense' AND cm.source_id = e.id AND cm.deleted_at IS NULL
    WHERE e.deleted_at IS NULL AND cm.id IS NULL;
    ```
*   **Current Count:** 0

### 1c. Active sale with no active matching cash_movement
*   **Query:**
    ```sql
    SELECT s.id, s.source, s.amount_cents
    FROM sale s
    LEFT JOIN cash_movement cm ON cm.source_type = 'sale' AND cm.source_id = s.id AND cm.deleted_at IS NULL
    WHERE s.deleted_at IS NULL AND cm.id IS NULL;
    ```
*   **Current Count:** 0

### 2a. Active order deposit > 0 (not delivered/cancelled) with no active cash_movement(deposit)
*   **Query:**
    ```sql
    SELECT o.id, o.customer_name, o.deposit_cents
    FROM "order" o
    LEFT JOIN cash_movement cm ON cm.source_type = 'deposit' AND cm.source_id = o.id AND cm.deleted_at IS NULL
    WHERE o.deleted_at IS NULL AND o.status NOT IN ('delivered', 'cancelled') AND o.deposit_cents > 0 AND cm.id IS NULL;
    ```
*   **Current Count:** 0

### 2b. Active cash_movement(deposit) with no active order matching the deposit
*   **Query:**
    ```sql
    SELECT cm.id, cm.source_id, cm.amount_cents
    FROM cash_movement cm
    LEFT JOIN "order" o ON o.id = cm.source_id AND o.deleted_at IS NULL AND o.status NOT IN ('delivered', 'cancelled') AND o.deposit_cents > 0
    WHERE cm.source_type = 'deposit' AND cm.deleted_at IS NULL AND o.id IS NULL;
    ```
*   **Current Count:** 0

### 3. Active cash_movement pointing at a deleted or non-existent parent row
*   **Query:**
    ```sql
    SELECT cm.id, cm.source_type, cm.source_id, cm.amount_cents
    FROM cash_movement cm
    WHERE cm.deleted_at IS NULL
      AND (
        (cm.source_type = 'purchase' AND NOT EXISTS (SELECT 1 FROM purchase p WHERE p.id = cm.source_id AND p.deleted_at IS NULL)) OR
        (cm.source_type = 'expense' AND NOT EXISTS (SELECT 1 FROM expense e WHERE e.id = cm.source_id AND e.deleted_at IS NULL)) OR
        (cm.source_type = 'sale' AND NOT EXISTS (SELECT 1 FROM sale s WHERE s.id = cm.source_id AND s.deleted_at IS NULL)) OR
        (cm.source_type = 'deposit' AND NOT EXISTS (SELECT 1 FROM "order" o WHERE o.id = cm.source_id AND o.deleted_at IS NULL)) OR
        (cm.source_type IN ('owner_draw', 'owner_inject') AND NOT EXISTS (SELECT 1 FROM owner_transaction ot WHERE ot.id = cm.source_id AND ot.deleted_at IS NULL))
      );
    ```
*   **Current Count:** 0

### 4. Active cash_movement on a soft-deleted or archived account still feeding totals
*   **Query:**
    ```sql
    SELECT cm.id, cm.amount_cents, cm.direction, a.name, a.is_archived, a.deleted_at
    FROM cash_movement cm
    INNER JOIN account a ON a.id = cm.account_id
    WHERE cm.deleted_at IS NULL AND (a.deleted_at IS NOT NULL OR a.is_archived = true);
    ```
*   **Current Count:** 0

### 5. Unbalanced transfer pairs in cash_movement
*   **Query:**
    ```sql
    SELECT cm.source_id,
           COUNT(*) FILTER (WHERE cm.direction = 'in') as in_count,
           COUNT(*) FILTER (WHERE cm.direction = 'out') as out_count
    FROM cash_movement cm
    WHERE cm.source_type = 'transfer' AND cm.deleted_at IS NULL
    GROUP BY cm.source_id
    HAVING COUNT(*) FILTER (WHERE cm.direction = 'in') <> COUNT(*) FILTER (WHERE cm.direction = 'out');
    ```
*   **Current Count:** 0

### 6a. Mismatched order-source sale.amountCents vs order.totalPriceCents
*   **Query:**
    ```sql
    SELECT s.id as sale_id, s.amount_cents as sale_cents, o.id as order_id, o.total_price_cents as order_cents
    FROM sale s
    INNER JOIN "order" o ON s.order_id = o.id
    WHERE s.deleted_at IS NULL AND o.deleted_at IS NULL AND s.amount_cents <> o.total_price_cents;
    ```
*   **Current Count:** 0

### 6b. Deposit double-count check (cash_movement for order-sourced sale does not subtract deposit)
*   **Query:**
    ```sql
    SELECT s.id as sale_id, cm.id as movement_id, cm.amount_cents as movement_cents, o.id as order_id, o.total_price_cents, o.deposit_cents
    FROM sale s
    INNER JOIN "order" o ON s.order_id = o.id
    INNER JOIN cash_movement cm ON cm.source_type = 'sale' AND cm.source_id = s.id AND cm.deleted_at IS NULL
    WHERE s.deleted_at IS NULL AND o.deleted_at IS NULL
      AND cm.amount_cents = o.total_price_cents
      AND o.deposit_cents > 0;
    ```
*   **Current Count:** 0

### Live Financial Integrity Check (runFinancialIntegrityCheck) Result
```json
{
  "asOfDate": "2026-07-08",
  "overallStatus": "PASS",
  "summaryAr": "كل الحسابات سليمة. النظام متماسك ماليًا.",
  "results": [
    {
      "id": "IC-1",
      "invariantId": "INV-11",
      "status": "PASS",
      "titleAr": "توازن الميزانية (فحص حقيقي)",
      "descriptionAr": "يقارن حقوق الملكية المحسوبة من السجل (41.800 د.أ) مع حقوق الملكية المحسوبة من المكوّنات (41.800 د.أ). يجب أن يتطابقا.",
      "driftCents": 0
    },
    {
      "id": "IC-2",
      "invariantId": "INV-1, INV-2",
      "status": "PASS",
      "titleAr": "لا توجد حركات يتيمة في السجل",
      "descriptionAr": "كل حركة في cash_movement يجب أن يكون لها صف أب في الجدول المناسب (مبيعة/مصروف/شراء/طلب/معاملة مالك). التحويلات يجب أن تأتي بأزواج (داخل + خارج بنفس المعرّف).",
      "offendingIds": [],
      "count": 0
    },
    {
      "id": "IC-3",
      "invariantId": "INV-3, INV-9",
      "status": "PASS",
      "titleAr": "اتساق عربونات الطلبات مع السجل",
      "descriptionAr": "كل طلب غير مُسلَّم بعربون > 0 يجب أن يكون له حركة عربون واحدة نشطة. الطلبات المُسلَّمة/الملغاة يجب ألا يكون لها حركة عربون نشطة.",
      "offendingIds": [],
      "count": 0
    },
    {
      "id": "IC-4",
      "invariantId": "INV-4",
      "status": "PASS",
      "titleAr": "لا ازدواج عدّ للعربون في المبيعات",
      "descriptionAr": "لكل مبيعة محوَّلة من طلب: المبلغ المُرحَّل للسجل (مصدر 'sale') يجب أن يساوي (سعر الطلب − العربون). لو ساوى السعر الكامل، فالعربون محسوب مرتين.",
      "offendingIds": [],
      "count": 0
    },
    {
      "id": "IC-5",
      "invariantId": "INV-13, INV-14",
      "status": "PASS",
      "titleAr": "لا يوجد حساب مؤرشف برصيد غير صفري",
      "descriptionAr": "أرشفة حساب برصيد غير صفري تُخفي أمواله من الميزانية ولوحة القيادة. يجب تحويل الرصيد قبل الأرشفة.",
      "offendingIds": [],
      "count": 0
    },
    {
      "id": "IC-6",
      "invariantId": "INV-12",
      "status": "PASS",
      "titleAr": "تسوية صافي الأرباح مع الميزانية",
      "descriptionAr": "صافي الأرباح (أساس نقدي) = 41.800 د.أ. الأرباح المحتجزة + العربونات كالتزام = 41.800 د.أ. يجب أن يتطابقا.",
      "driftCents": 0
    },
    {
      "id": "IC-7",
      "invariantId": "INV-15, INV-16",
      "status": "PASS",
      "titleAr": "اتساق وحدة المال والأرصدة",
      "descriptionAr": "يتحقّق من عدم وجود حسابات برصيد سالب غير مبرَّر (قد يعني حركة خارجة أكبر من المتاح، أو خطأ إدخال).",
      "offendingIds": [],
      "count": 0
    },
    {
      "id": "IC-8",
      "invariantId": "F-05-drift",
      "status": "PASS",
      "titleAr": "مطابقة سجل النقد مع الجداول المساعدة",
      "descriptionAr": "صافي أرباح السجل النقدي = 81.800 د.أ. صافي أرباح الجداول المساعدة = 81.800 د.أ. الانحراف = 0.000 د.أ.",
      "driftCents": 0
    }
  ]
}
```

---

## 2. Displayed-Number to Single-Source-of-Truth Map

This table maps every monetary figure displayed on the Dashboard (`/`), Finance tabs (`/finance`), and Reports page (`/reports`).

| Number (Arabic Label) | Page / Section | Canonical Source Query (path:line) | Render Site (path:line) | Status / Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **النقد الحر** | Dashboard (`/`) / Cash Hero Card | `totalCash + totalBank - depositsHeld` derived from [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L388-L406) and [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L1480-L1538) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L351) | **ALREADY-CORRECT** (Uses cash movement ledger inputs minus deferred deposit liabilities) |
| **صندوق (نقد متاح)** | Dashboard (`/`) / Cash Hero Details | `getAccountBalances` in [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L1480-L1538) (sums cash movements for accounts where `type = 'cash'`) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L366) | **ALREADY-CORRECT** |
| **حسابات البنك** | Dashboard (`/`) / Cash Hero Details | `getAccountBalances` in [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L1480-L1538) (sums cash movements for accounts where `type = 'bank'`) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L372) | **ALREADY-CORRECT** |
| **إجمالي النقد المتاح** | Dashboard (`/`) / Cash Hero Details | sum of cash + bank balances from `getAccountBalances` | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L378) | **ALREADY-CORRECT** |
| **منها عربونات كالتزام** | Dashboard (`/`) / Cash Hero Details | `getCashSummary` in [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L388-L406) (queries `order` table directly) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L384) | **ALREADY-CORRECT** (Uses `order` table directly for active order deposits since they represent liability) |
| **صافي التدفق النقدي (الربح)** | Dashboard (`/`) / Period Metrics | `getFinancialSummary` in [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L26-L80) (sums `cash_movement` for period) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L407) | **ALREADY-CORRECT** |
| **السيولة المتاحة (بيع + عربون)** | Dashboard (`/`) / Period Metrics | `getFinancialSummary` in [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L26-L80) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L430) | **ALREADY-CORRECT** |
| **المشتريات المدفوعة** | Dashboard (`/`) / Period Metrics | `getFinancialSummary` in [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L26-L80) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L453) | **ALREADY-CORRECT** |
| **المصاريف المدفوعة** | Dashboard (`/`) / Period Metrics | `getFinancialSummary` in [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L26-L80) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L476) | **ALREADY-CORRECT** |
| **فئات المصاريف (الكمية)** | Dashboard (`/`) / Expenses Section | `getDashboardStats` in [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L281-L381) (queries `expense` table directly) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L500) | **ALREADY-CORRECT** (Uses source `expense` table; matches ledger due to active write guards) |
| **عربونات بحوزتك** | Dashboard (`/`) / Liabilities section | `getCashSummary` in [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L388-L406) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L523) | **ALREADY-CORRECT** |
| **مبالغ متوقعة (متبقي الطلبات)** | Dashboard (`/`) / Liabilities section | `getCashSummary` in [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L388-L406) (sums `totalPrice - deposit` for active orders) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L544) | **ALREADY-CORRECT** (Operates as operational forecast estimate, not realized ledger totals) |
| **سعر الطلب / عربون** | Dashboard (`/`) / Delivery list | `getDashboardStats` in [queries.ts (dashboard)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/queries.ts#L281-L381) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L594-L597) | **ALREADY-CORRECT** |
| **المشتريات الإجمالية** | Finance (`/finance`) / Purchases tab | `useInfinitePurchases` queries `purchase` table directly | [PurchasesTab.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/components/PurchasesTab.tsx#L161-L168) | **ALREADY-CORRECT** (Finance tabs represent source document ledgers, matched with cash movements) |
| **المصاريف الإجمالية** | Finance (`/finance`) / Expenses tab | `useInfiniteExpenses` queries `expense` table directly | [ExpensesTab.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/components/ExpensesTab.tsx#L161) | **ALREADY-CORRECT** |
| **مبالغ المبيعات** | Finance (`/finance`) / Sales tab | `useInfiniteSales` queries `sale` table directly | [SalesTab.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/components/SalesTab.tsx#L161) | **ALREADY-CORRECT** |
| **رصيد الحساب** | Finance (`/finance`) / Accounts tab | `useAccountBalancesQuery` queries `getAccountBalances` action | [AccountsTab.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/components/AccountsTab.tsx#L181) | **ALREADY-CORRECT** (Sum of cash movements for the specific account) |
| **إجمالي الصناديق النشطة** | Finance (`/finance`) / Accounts tab | sum of active account balances of type 'cash' from query | [AccountsTab.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/components/AccountsTab.tsx#L231) | **ALREADY-CORRECT** |
| **إجمالي البنوك النشطة** | Finance (`/finance`) / Accounts tab | sum of active account balances of type 'bank' from query | [AccountsTab.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/components/AccountsTab.tsx#L237) | **ALREADY-CORRECT** |
| **مبلغ حركة المالك** | Finance (`/finance`) / Owner tab | `useOwnerTransactions` queries `owner_transaction` directly | [OwnerTab.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/components/OwnerTab.tsx#L144) | **ALREADY-CORRECT** |
| **صافي تعاملات المالك** | Finance (`/finance`) / Owner tab | sum of injects minus draws from owner transactions query | [OwnerTab.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/components/OwnerTab.tsx#L181) | **ALREADY-CORRECT** |
| **صافي الأرباح / الخسائر** | Reports (`/reports`) / P&L tab | `computeCashBasisPnl` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L49-L98) (ledger-based `cashMovement`) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L331) | **ALREADY-CORRECT** (Cash-basis correct) |
| **إجمالي المبيعات (P&L)** | Reports (`/reports`) / P&L tab | `computeCashBasisPnl` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L49-L98) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L346) | **ALREADY-CORRECT** (Ledger-based cash revenues) |
| **إجمالي المشتريات (P&L)** | Reports (`/reports`) / P&L tab | `computeCashBasisPnl` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L49-L98) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L354) | **ALREADY-CORRECT** (Ledger-based purchases) |
| **إجمالي المصاريف (P&L)** | Reports (`/reports`) / P&L tab | `computeCashBasisPnl` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L49-L98) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L362) | **ALREADY-CORRECT** (Ledger-based expenses) |
| **توزيع المصاريف (Donut)** | Reports (`/reports`) / Expenses tab | `getAllReportData` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L384-L393) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L418-L435) | **NEEDS-CHANGE** (Queries `expense` table directly. Should query `cash_movement` for strict cash-basis consistency) |
| **توزيع الطلبات (التقديري)** | Reports (`/reports`) / Orders tab | `getAllReportData` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L404-L412) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L525) | **ALREADY-CORRECT** (Operational estimate labeled "تقديري", correct) |
| **أكثر المنتجات طلباً** | Reports (`/reports`) / Products tab | `getAllReportData` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L413-L424) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L569) | **ALREADY-CORRECT** (Operational estimate labeled "تقديري", correct) |
| **نقدية الصندوق (الميزانية)** | Reports (`/reports`) / Balance Sheet | `getFinancialPosition` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L535-L579) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L621) | **ALREADY-CORRECT** (Ledger cash_movement total for cash accounts) |
| **أرصدة البنك (الميزانية)** | Reports (`/reports`) / Balance Sheet | `getFinancialPosition` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L540-L585) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L627) | **ALREADY-CORRECT** (Ledger cash_movement total for bank accounts) |
| **إجمالي الأصول** | Reports (`/reports`) / Balance Sheet | sum of cash + bank balances from `getFinancialPosition` | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L633) | **ALREADY-CORRECT** |
| **عربونات مؤجلة (الميزانية)** | Reports (`/reports`) / Balance Sheet | `getFinancialPosition` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L590-L601) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L649) | **ALREADY-CORRECT** (Customer deposits as liability, sourced from `order`) |
| **نقدية البداية (الميزانية)** | Reports (`/reports`) / Balance Sheet | `getFinancialPosition` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L605-L617) (opening balance movements) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L671) | **ALREADY-CORRECT** |
| **رأس المال المصرح به** | Reports (`/reports`) / Balance Sheet | `getFinancialPosition` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L619-L624) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L677) | **ALREADY-CORRECT** (Reference value, correct) |
| **إيداعات إضافية للمالك** | Reports (`/reports`) / Balance Sheet | `getFinancialPosition` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L627-L639) (queries `owner_transaction` directly) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L683) | **NEEDS-CHANGE** (Should query `cash_movement` with sourceType `owner_inject` for strict ledger-basis consistency) |
| **مسحوبات شخصية للمالك** | Reports (`/reports`) / Balance Sheet | `getFinancialPosition` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L641-L653) (queries `owner_transaction` directly) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L688) | **NEEDS-CHANGE** (Should query `cash_movement` with sourceType `owner_draw` for strict ledger-basis consistency) |
| **أرباح مدورة محتجزة** | Reports (`/reports`) / Balance Sheet | `getFinancialPosition` in [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L656-L687) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L695) | **ALREADY-CORRECT** (Derived from ledger movements, minus deferred deposits) |
| **إجمالي حقوق الملكية** | Reports (`/reports`) / Balance Sheet | sum of equity fields from `getFinancialPosition` | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L701) | **ALREADY-CORRECT** |
| **تسويات المطابقة** | Reports (`/reports`) / Balance Sheet Details | derived from `getFinancialPosition` | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L743-L772) | **ALREADY-CORRECT** (Detailed ledger and source reconciliation fields, correct) |

---

## 3. Flagged Divergences & Recommended Fixes

The following architectural fixes are recommended to achieve absolute single-source-of-truth consistency.

### Divergence 1: Reports Donut Chart Queries Source Document Table Instead of Ledger
*   **Location:** [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L384-L393)
*   **Why it needs change:** In cash-basis reporting, expense breakdown should strictly query the actual ledger cash movements (`cash_movement`) where `direction = 'out'` and `sourceType = 'expense'`, instead of querying the `expense` source document table directly.
*   **Recommended Fix:**
    ```diff
    -        db
    -          .select({
    -            category: expense.category,
    -            total: sum(expense.amountCents),
    -            count: count(expense.id),
    -          })
    -          .from(expense)
    -          .where(buildDateCondition(expense, range))
    -          .groupBy(expense.category)
    -          .orderBy(desc(sql`sum(${expense.amountCents})`)),
    +        db
    +          .select({
    +            category: expense.category,
    +            total: sum(cashMovement.amountCents),
    +            count: count(cashMovement.id),
    +          })
    +          .from(cashMovement)
    +          .innerJoin(expense, eq(cashMovement.sourceId, expense.id))
    +          .where(
    +            and(
    +              isNull(cashMovement.deletedAt),
    +              isNull(expense.deletedAt),
    +              eq(cashMovement.direction, "out"),
    +              eq(cashMovement.sourceType, "expense"),
    +              // date filter based on cashMovement date
    +              rangeStartDate(range) ? gte(cashMovement.date, rangeStartDate(range)!) : sql`true`,
    +              rangeEndDate(range) ? sql`${cashMovement.date} <= ${rangeEndDate(range)}` : sql`true`
    +            )
    +          )
    +          .groupBy(expense.category)
    +          .orderBy(desc(sum(cashMovement.amountCents))),
    ```

### Divergence 2: Owner Injections and Drawings in Balance Sheet Query Source Document Tables Directly
*   **Location:** [actions.ts (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L627-L653)
*   **Why it needs change:** The financial position sheet should fetch actual cash flows (investments and withdrawals) directly from the `cash_movement` ledger entries rather than the `owner_transaction` source document tables.
*   **Recommended Fix:**
    ```diff
    -      const [injectionsRes] = await tx
    -        .select({ total: sum(ownerTransaction.amountCents) })
    -        .from(ownerTransaction)
    -        .innerJoin(account, eq(ownerTransaction.accountId, account.id))
    -        .where(
    -          and(
    -            eq(ownerTransaction.type, "inject"),
    -            sql`${ownerTransaction.date} <= ${asOfDate}`,
    -            isNull(ownerTransaction.deletedAt),
    -            isNull(account.deletedAt)
    -          )
    -        );
    +      const [injectionsRes] = await tx
    +        .select({ total: sum(cashMovement.amountCents) })
    +        .from(cashMovement)
    +        .innerJoin(account, eq(cashMovement.accountId, account.id))
    +        .where(
    +          and(
    +            eq(cashMovement.direction, "in"),
    +            eq(cashMovement.sourceType, "owner_inject"),
    +            sql`${cashMovement.date} <= ${asOfDate}`,
    +            isNull(cashMovement.deletedAt),
    +            isNull(account.deletedAt)
    +          )
    +        );
    ```
    *(And repeat similarly for `drawingsRes` by checking `direction = 'out'` and `sourceType = 'owner_draw'` in `cashMovement`).*

---
*This document contains analysis and proposals only. No code, database state, or migrations have been applied to the workspace.*
