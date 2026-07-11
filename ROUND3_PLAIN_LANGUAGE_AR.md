# ROUND 3 — Plain-Language Arabic Clarity Audit (For Non-Literate Owner)

> [!IMPORTANT]
> **Priority Goal:** The owner of Zman App is non-financial and has low literacy. All terms, indicators, errors, and system feedback must be proposed in highly intuitive, conversational, visual Jordan-dialect Arabic. Avoid dry accounting terms (like accruals, debit, credit, equity) and replace them with expressions focused on physical cash ("in the drawer", "in hand", "on delivery").

---

## 1. Jargon Inventory & Plain Arabic Translations

The table below lists every confusing financial and technical term currently rendered in the UI, citing its path and line number, explaining why it's confusing to a layperson, and proposing simplified Arabic equivalents.

| Current Arabic UI String | English / Accounting Context | File and Line Number | Why It's Confusing for Owner | Proposed Plain-Arabic Replacement / Explanation |
| :--- | :--- | :--- | :--- | :--- |
| **حقوق الملكية** | Equity / Owner's net value | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L665) | Too academic. The owner doesn't know what "equity" means in a workshop context. | **صافي قيمة مشروعك الحالي (بعد خصم ديون الزبائن والالتزامات)** |
| **الأرباح المحتجزة** / **أرباح مدورة محتجزة** | Retained Earnings | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L693) | Sounds like frozen money or money that is blocked. | **أرباحك المتراكمة اللي لسه ما سحبتهاش شخصيًا** |
| **الالتزامات (المطالبات)** | Liabilities | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L643) | Vague. In this system, liabilities are solely customer deposits held before delivery. | **عربونات الزبائن (التزام شغل لسه ما تسلّم)** |
| **عربونات كالتزام** | Customer Deposits Held | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L382) | "كالتزام" is legalistic. | **عرابين زبائن (لازم تسلّمهم شغلهم أول)** |
| **أساس نقدي** | Cash Basis | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L358) | Sounds like standard accounting jargon. | **حسابات الكاش الفعلي (اللي استلمته ودفعته بإيدك)** |
| **التسوية / مطابقة مظهرة** | Reconciliation | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L734) | Very abstract accounting term. | **تأكيد صحة الحسابات ومطابقة الصندوق** |
| **الدفتر النقدي / Ledger** | General Ledger / Cash Journal | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L759) | English terms ("Ledger") and dry terms confuse the owner. | **سجل حركة الصناديق والبنك (كل قرش داخل وطالع)** |
| **صافي التدفق النقدي (الربح)** | Net Cash Flow (Profit) | [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L398) | "التدفق النقدي" is complex corporate jargon. | **الربح الصافي الفعلي (الكاش الباقي بيدك بعد كل المصاريف)** |
| **رأس المال المصرّح** / **رأس مال البداية** | Declared Capital | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L675) | "المصرّح" is administrative and confusing. | **قيمة رأس المال اللي بدأت فيه المشروع (للمرجعية)** |
| **المتبقي المُرحَّل** | Remainder Posted / Traced | Operations (actions.ts) | Accounting term. | **الكاش المستلم عند تسليم الطلب** |
| **عربون مُرحَّل** | Deposit Posted / Traced | Operations (actions.ts) | Accounting term. | **الكاش المستلم مقدماً كعربون** |
| **Drift / انحراف** | Ledger-Source Variance | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L769) | Sound like telemetry or engine drift. | **فرق غير مبرَّر بين الكاش الفعلي والفواتير — بحاجة لمراجعة** |
| **P&L** | Profit and Loss Statement | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L320) | English abbreviations are unintelligible. | **كشف الأرباح والخسائر للفترة** |
| **فحص السلامة الماليّة** / **IC** | Integrity Check (IC-1..IC-8) | [page.tsx (reports)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/(app)/reports/page.tsx#L787) | Codes like "IC-8" and "Integrity Checks" look like error codes. | **نظام الفحص التلقائي لسلامة الصندوق (فحوصات الأمان 1 إلى 8)** |

---

## 2. Number-Clarity Checklist (Visual Signals & Labels)

To support quick, non-literate comprehension of monetary amounts, each rendered cash figure must satisfy four specific constraints. The checklist below evaluates current compliance and flags failures:

### Checklist Rules
1.  **Money IN vs OUT:** Every amount must show a clear verbal prefix ("دخل:" / "+", "صرف:" / "−") and be color-coded (green/blue for cash-in, red/orange for cash-out), not just a plain number or negative sign.
2.  **REAL Cash vs ESTIMATE:** Realized cash (money physically in the drawer) must be clearly distinguished from operational forecasts (unsold inventories or future payments) via an obvious label: **[كاش فعلي بيدك]** vs **[تقديري/متوقّع مستقبلاً]**.
3.  **Time Scope:** The time frame must be explicitly labeled (e.g., "كل الأوقات" or "خلال الـ 30 يوماً المحددة") so the owner understands why numbers change when filters are applied.
4.  **Currency & Digit Formatting:** Jordian Dinars must display as `د.أ` with `3 decimals` using Latin-Jordan standard digits (e.g. `12.500 د.أ`).

### Anomalies & Proposed Fixes

#### Card A: "مبالغ متوقعة (متبقي الطلبات)" Card
*   **Render Site:** [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L536-L545)
*   **Failure:** Shows a plain amount with no IN/OUT sign, and the badge "متوقّع" is generic.
*   **Proposed Fix:** Add a plus sign and change the badge to: `دخل متوقّع عند التسليم (مش كاش بيدك لسه)`.
    *   *Before:* `مبالغ متوقعة (متبقي الطلبات)`
    *   *After:* `مبالغ متوقعة (متبقي الطلبات لسه ما استلمتها كاش)` with a `+` prefix to the amount.

#### Card B: "السيولة المتاحة (بيع + عربون)" Card
*   **Render Site:** [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L423-L432)
*   **Failure:** The label "السيولة المتاحة" sounds like general liquidity.
*   **Proposed Fix:** Change label to: `كاش المبيعات والعربونات المستلمة فعلياً`.
    *   *Before:* `السيولة المتاحة (بيع + عربون)`
    *   *After:* `المقبوضات النقدية (مبيعات + عربونات زبائن استلمتها فعلاً)`

#### Table C: Upcoming Orders List
*   **Render Site:** [DashboardClient.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L594-L597)
*   **Failure:** Renders totalPriceCents and depositCents without explicit distinction of what is realized cash vs estimate.
*   **Proposed Fix:** Label totalPriceCents as: `سعر الطلب الكامل (تقديري)` and depositCents as: `العربون المدفوع (كاش في الصندوق)`.

---

## 3. Error & Guard Messages (Plain Language Rewrites)

User-facing errors must tell the owner **what happened** and **what to do next** in simple Jordanian Arabic, avoiding database or technical terminology.

### Transfer Archived Guard Message
*   **Location:** [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L1589)
*   **Before:** `status: "error", message: "لا يمكن التحويل من أو إلى حساب مؤرشف"`
*   **After:** `status: "error", message: "هذا الحساب مغلق (مؤرشف). عشان تقدر تحول منه أو إله، لازم تروح على صفحة الحسابات وتلغي إغلاقه (الأرشفة) أولاً."`

### Owner Transaction Archived Guard Message
*   **Location:** [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L1685)
*   **Before:** `status: "error", message: "لا يمكن تنفيذ عمليات مالية على حساب مؤرشف"`
*   **After:** `status: "error", message: "هذا الصندوق مغلق (مؤرشف) وما بتقدر تسحب منه أو تحط فيه كاش حالياً. افتحه أولاً من صفحة الحسابات أو اختار صندوق ثاني نشيط."`

### Opening Balance Archived Guard Message
*   **Location:** [actions.ts (finance)](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/actions.ts#L1868)
*   **Before:** `status: "error", message: "لا يمكن تعديل الأرصدة الافتتاحية لأن حساب الصندوق أو البنك الرئيسي مؤرشف حالياً."`
*   **After:** `status: "error", message: "الصندوق الرئيسي أو حساب البنك مغلق (مؤرشف) حالياً. عشان تعدل أرصدة البداية، لازم تروح تلغي إغلاقهم (الأرشفة) أولاً."`

---

## 4. IC Panel & Reconciliation Panel (Owner-Friendly Wording)

The integrity checks (IC-1 to IC-8) must be translated into direct, human-friendly status lines indicating whether everything is safe, or what specific issue needs attention.

| Check ID | UI Title (Simplified) | Plain Arabic Status Line: PASS (Green) | Plain Arabic Status Line: FAIL/WARN (Red/Yellow) | Path & Line |
| :--- | :--- | :--- | :--- | :--- |
| **IC-1** | **تطابق كاش الخزنة والميزانية** | `حساباتك متطابقة 100%: الكاش الموجود بالصندوق والبنك يطابق رأس المال بالإضافة لأرباح الورشة الفعلية بعد خصم مسحوباتك الشخصية.` | `تنبيه: الكاش الفعلي بالصناديق لا يتطابق مع رأس المال والأرباح المسجلة. قد يكون هناك سحب شخصي أو إيداع لم تسجله.` | [integrityCheck.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/integrityCheck.ts#L92-L222) |
| **IC-2** | **سلامة مصدر حركات الكاش** | `كل المبالغ المسجّلة بالصندوق والبنك معروفة المصدر ومرتبطة بفواتير بيع أو شراء أو مصروف حقيقية.` | `خطأ: يوجد كاش داخل أو خارج من الصندوق ولكن فاتورته الأصلية انحذفت أو غير موجودة! اضغط لمعرفة الحركة الضائعة وتصحيحها.` | [integrityCheck.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/integrityCheck.ts#L228-L326) |
| **IC-3** | **مطابقة عربونات الزبائن** | `كاش العربونات للطلبات قيد التنفيذ يطابق تماماً المبالغ الفعلية المستلمة في خزنتك.` | `تنبيه: يوجد طلبات قيد التنفيذ مسجّل لها عربون ولكن لم يدخل كاش الصندوق، أو العكس (كاش مسجّل لعربون طلب ملغى أو مكتمل).` | [integrityCheck.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/integrityCheck.ts#L332-L397) |
| **IC-4** | **منع تكرار العربون** | `النظام يمنع تكرار حساب العربون؛ مبيعات الطلبات المسلّمة تسجّل فقط المبلغ المتبقي المستلم نقداً.` | `خطأ: تم تسجيل مبيعة طلب بكامل القيمة في الصندوق دون خصم العربون الذي دفع مسبقاً، مما يضخم الأرباح دفترياً عن الحقيقة.` | [integrityCheck.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/integrityCheck.ts#L403-L453) |
| **IC-5** | **الصناديق المغلقة المؤرشفة** | `جميع الصناديق والحسابات المغلقة (المؤرشفة) رصيدها صفر حالياً، ولا يوجد أي نقدية مخفية خارج التقارير.` | `تنبيه: تم إغلاق حساب مالي ولكن رصيده ليس صفراً! هذا يخفي أموالاً من تقاريرك. يرجى إعادة تفعيله وتحويل رصيده أولاً.` | [integrityCheck.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/integrityCheck.ts#L459-L500) |
| **IC-6** | **مطابقة الأرباح المتراكمة** | `الأرباح التراكمية في ميزانيتك تتطابق بالكامل مع تقرير صافي الأرباح والخسائر التراكمي للورشة.` | `فارق في الأرباح: الأرباح التراكمية المسجّلة في الميزانية لا تتطابق مع مجموع الأرباح الفعليّة التراكمية. راجع الدعم.` | [integrityCheck.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/integrityCheck.ts#L506-L567) |
| **IC-7** | **خلو الصناديق من العجز** | `جميع صناديق الورشة تحتوي على مبالغ كافية، ولا يوجد أي حساب رصيده بالسالب (عجز مالي).` | `تنبيه: يوجد عجز مالي في أحد الصناديق (رصيده بالسالب)! هذا يعني دفترياً أنك دفعت منه كاش أكثر من المتوفر فيه.` | [integrityCheck.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/integrityCheck.ts#L573-L606) |
| **IC-8** | **مطابقة الكاش مع الفواتير** | `تطابق تام: مجموع الكاش الفعلي في الصناديق يطابق تماماً مجموع فواتير المبيعات والمصاريف والمشتريات النشطة.` | `انحراف في تطابق الصندوق: يوجد فارق (Drift) بين كاش الصندوق الفعلي ومجموع الفواتير المسجّلة. يرجى مطابقتها.` | [integrityCheck.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/finance/integrityCheck.ts#L612-L684) |

---
*This document contains analysis and proposals only. No code, database state, or migrations have been applied to the workspace.*
