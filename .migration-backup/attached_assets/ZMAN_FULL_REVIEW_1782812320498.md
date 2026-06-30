# المراجعة الشاملة لنظام Zman — مراجعة معمارية + أداء + ميزات جديدة

> **الإصدار:** 1.0 — مراجعة شاملة بعد إزالة Sentry وإصلاح كل ملاحظات التدقيق السابقة
> **المستودع:** `github.com/balqeesemad1996/zman-app` @ commit `157a9e9` (فرع `main`)
> **التاريخ:** 30 يونيو 2026
> **المنهج:** قراءة الكود الفعلي الملتزم في المستودع، كل ادعاء موثق بـ `ملف:سطر`. لا افتراضات.

---

## جدول المحتويات

1. [الحالة الراهنة للنظام (تأكيد)](#1-الحالة-الراهنة-للنظام-تأكيد)
2. [الجزء 1 — حاجز النشر (Cloudflare vs Vercel)](#2-الجزء-1--حاجز-النشر-cloudflare-vs-vercel)
3. [الجزء 2 — الأداء والتشغيل المستدام](#3-الجزء-2--الأداء-والتشغيل-المستدام)
4. [الجزء 3 — مطابقة نموذج التكلفة (7,000–150,000 فلس)](#4-الجزء-3--مطابقة-نموذج-التكلفة-7000150000-فلس)
5. [الجزء 4 — ميزة جديدة: قائمة المكونات المعرّفة مسبقاً](#5-الجزء-4--ميزة-جديدة-قائمة-المكونات-المعرّفة-مسبقاً)
6. [الجزء 5 — ميزة جديدة: مكتبة القوالب النصية القابلة للنسخ](#6-الجزء-5--ميزة-جديدة-مكتبة-القوالب-النصية-القابلة-للنسخ)
7. [الجزء 6 — إعادة تقييم تجربة الموبايل](#7-الجزء-6--إعادة-تقييم-تجربة-الموبايل)
8. [الجزء 7 — تحسينات استشرافية ضمن النطاق](#8-الجزء-7--تحسينات-استشرافية-ضمن-النطاق)
9. [القرارات النهائية والحكم](#9-القرارات-النهائية-والحكم)

---

## 1. الحالة الراهنة للنظام (تأكيد)

### 1.1 تأكيد الالتزام (git log)

```bash
$ git log --oneline -5
157a9e9 Remove Sentry, restore 150KB ceiling, fix all audit findings
fb6e391 Add Cloudflare/OpenNext deployment config
d2019e4 Slice 5 tests + money fix + Supabase live
55b694f Docs: Update First Load JS performance ceiling to 230KB to accommodate Sentry
e3768a4 Remediation: Fix all strict typecheck, Sentry, logical positioning, error states, and Markdown reports
```

**التغييرات منذ آخر مراجعة:**
- إزالة `@sentry/nextjs` بالكامل + 3 ملفات إعدادات (`sentry.{client,server,edge}.config.ts`)
- إعادة سقف Bundle إلى 150KB (بدلاً من 230KB)
- إضافة `src/middleware.ts` (بوابة رمز دخول) + `src/app/login/`
- إضافة `src/app/global-error.tsx` (حدود أخطاء عامة)
- إضافة `src/lib/db/errors.ts` (مُرجِع أخطاء Postgres → رسائل عربية)
- إضافة `drizzle/migrations/0002_nervous_ego.sql` (فهرسان + تكرار idempotent للـ triggers)
- جعل Upstash اختيارياً (`src/lib/env.ts` + `src/lib/ratelimit.ts` no-op fallback)
- موازاة استعلامات لوحة القيادة عبر `Promise.all` (`dashboard/queries.ts`)
- إصلاح ترقيم الصفحات للطلبات (tuple comparison `(createdAt, id) < (cursor.createdAt, cursor)`)

### 1.2 ناتج البناء (pnpm build)

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    14 kB         140 kB
├ ○ /_not-found                          991 B         105 kB
├ ○ /finance                             3.45 kB         120 kB
├ ○ /login                               2.75 kB         107 kB
├ ○ /manifest.webmanifest                  123 B         104 kB
├ ○ /orders                              6.38 kB         133 kB
└ ○ /reports                             3.42 kB         129 kB
+ First Load JS shared by all             104 kB
  ├ chunks/926-3675bd13a8f1c4ce.js       47.3 kB
  ├ chunks/a730c7c8-f3d191a9118b600d.js  54.2 kB
  └ other shared chunks (total)          2.27 kB

ƒ Middleware                             32.5 kB
```

**النتيجة:** كل المسارات ≤ 140KB — سقف 150KB محقق مع هامش. إزالة Sentry خفضت الـ shared bundle من 175KB → 104KB (−71KB).

### 1.3 الاختبارات

```
$ pnpm test
 Test Files  4 passed (4)
      Tests  27 passed (27)
```

27 اختبار ناجح في: `money.test.ts` (8), `schemas.test.ts` (8), `whatsapp.test.ts` (6), `finance.test.ts` (5).

---

## 2. الجزء 1 — حاجز النشر (Cloudflare vs Vercel)

### 2.1 تأكيد التشخيص: استنزاف الاتصالات المتزامنة على Cloudflare Workers

**التشخيص صحيح.** تتبّع كل مسار اتصال بقاعدة البيانات:

#### 2.1.1 نقطة إنشاء الاتصال

**الملف:** `src/lib/db/client.ts:7-11`

```typescript
const client = postgres(env.DATABASE_URL, {
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 30,
});
export const db = drizzle(client, { schema });
```

- نسخة واحدة `postgres` (singleton) مع pool داخلي افتراضي `max: 10` اتصالات.
- على Node.js (Vercel): يعمل أصلياً بلا قيود.
- على Cloudflare Workers: وقت التشغيل يحدّ عدد المقابس (TCP sockets) المتزامنة بـ **~6 اتصالات** لكل استدعاء Worker. الـ `postgres.js` يحاول فتح 10 فيتجاوز الحد.

#### 2.1.2 عدّ الاتصالات المتزامنة لكل تحميل للوحة القيادة

**الملف:** `src/features/dashboard/components/DashboardClient.tsx:75-90`

```typescript
const { data: summary, ... } = useFinancialSummary(startDateStr, endDateStr);
const { data: activities, ... } = useRecentActivities();
const { data: trendData, ... } = useFinancialTrendData(startDateStr, endDateStr);
```

React Query يطلق كل الاستعلامات المُفعّلة في نفس الوقت عند التحميل — هذه الـ 3 hooks **ليست متسلسلة**. كل hook داخلياً يستخدم `Promise.all` لتوزيع عدة استعلامات:

| الـ Hook | الملف:السطر | استعلامات متزامنة داخلياً |
|---|---|---|
| `useFinancialSummary` | `dashboard/queries.ts:29` | 3 (مبيعات + مصاريف + مشتريات SUM) |
| `useRecentActivities` | `dashboard/queries.ts:83` | 4 (آخر 5 من كل جدول) |
| `useFinancialTrendData` | `dashboard/queries.ts:173` | 3 (تجميع يومي لـ 3 جداول) |
| **المجموع** | | **10 اتصالات متزامنة** |

**10 > 6** → أول 6 استعلامات تنجح (تُعرض بيانات جزئية)، الباقي يفشل بـ connection error منتصف التحميل. هذا يطابق الأعراض المُبلّغ عنها بالضبط: "اللوحة تظهر بعض البيانات ثم تفشل".

#### 2.1.3 مسارات DB الأخرى (لا تتجاوز الحد)

- `getOrders` (`orders/queries.ts:17-84`): استعلام واحد + استعلام cursor lookup = 2 متتالية (ليست متزامنة).
- `getOrder` (`orders/queries.ts:89-107`): استعلامان متتاليان (order ثم components).
- تبويبات المالية (`finance/queries.ts`): استعلام واحد لكل تبويب.

**لوحة القيادة هي المسار الوحيد الذي يخترق الحد** — لهذا الفشل محدد بالـ dashboard عند التحميل.

### 2.2 الخيارات لجعله يعمل على Cloudflare

#### الخيار A: Cloudflare Hyperdrive

**ما يتطلبه:**
1. ربط Hyperdrive في `wrangler.toml`:
   ```toml
   [[hyperdrive.configurations]]
   name = "zman-db"
   connection_string = "postgresql://..."
   ```
2. ربط الـ binding بـ Worker وإتاحته عبر `env.HYPERDRIVE.connectionString`.
3. تعديل `client.ts` لاستخدام Hyperdrive string عند توفره:
   ```typescript
   const connStr = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
   const client = postgres(connStr, { prepare: false, ... });
   ```

**آلية العمل:** Hyperdrive يجمع الاتصالات على الـ edge ويقدم socket واحد للـ Worker — فالـ Worker يرى اتصالاً واحداً مهما كان عدد الاستعلامات.

**حد الاتصالات:** تجمع Hyperdrive الخلفي ~5 اتصالات إلى Postgres، لكن قفزة Worker→Hyperdrive اتصال واحد — فحد الـ 6 للـ Worker لم يعد عنق الزجاجة.

**تفاعل `prepare:false`:** Hyperdrive يدعم prepared statements، لكن Supavisor (transaction mode) لا يدعمها. لذا يجب الإبقاء على `prepare: false`. التركيبة (Hyperdrive + Supavisor + `prepare:false`) تعمل — Hyperdrive يمرر الـ statements غير المُعدّة.

**التبادل (Tradeoffs):**
- ✅ يحل المشكلة جذرياً — يعمل الـ `Promise.all` كما صُمّم.
- ❌ يضيف سطح إعداد (binding في wrangler.toml + لوحة Cloudflare).
- ❌ يضيف قفزة (latency إضافية ~5-15ms).
- ❌ يقرن التطبيق ببنية تحتية خاصة بـ Cloudflare (`client.ts` يحتاج فرع شرطي).
- ❌ يعقّد النشر متعدد الأهداف (Vercel + Cloudflare معاً).

#### الخيار B: تقليل التزامن (تسلسل أو تحديد pool)

**ما يتطلبه:**
- استبدال `Promise.all` في `dashboard/queries.ts` بـ `await` متتالية، أو
- تحديد `postgres({ max: 5 })` لتحديد الاتصالات المتزامنة تحت سقف Worker.

**كلفة الأداء:**
- تسلسل 10 استعلامات: يحوّل ~1 round-trip (متوازي) إلى ~10 round-trips متتالية. عند ~50ms RTT من Cloudflare edge إلى Supabase → **+500ms latency** على كل تحميل للوحة.
- تحديد `max: 5`: أول 5 متزامنة، الباقي ينتظر → ~2 round-trips = +100ms. أفضل من التسلسل الكامل لكن لا يزال أبطأ من Vercel.

**التبادل:**
- ✅ يبقي التطبيق على Cloudflare بلا بنية تحتية جديدة.
- ❌ **يضحي صراحة بهدف السرعة** الذي يريده المالك — يحوّل تجربة الـ dashboard من "سريعة" إلى "بطيئة".

#### الخيار C: استعلام SQL موحّد (UNION ALL / CTE)

**ما يتطلبه:**
- إعادة كتابة الـ 3 استعلامات في `getFinancialSummary` كاستعلام واحد `UNION ALL` يرجع الـ 3 مجاميع في round-trip واحد.
- نفس الشيء للـ 4 استعلامات في `getRecentActivities` (UNION ALL لـ 4 SELECTs بـ LIMIT 5).
- نفس الشيء للـ 3 استعلامات في `getFinancialTrendData`.

**الأثر:** يقلّص 10 اتصالات → 3 اتصالات (واحد لكل hook)، ضمن سقف Cloudflare. يحافظ على التوازي على مستوى الـ hook (3 استعلامات متزامنة، ضمن حد الـ 6).

**التبادل:**
- ✅ يحل المشكلة بلا بنية تحتية جديدة، يحافظ على التوازي على مستوى الـ hook.
- ❌ SQL يصبح أصعب قراءة وصيانة. Drizzle لا يركّب `UNION ALL` عبر جداول مختلفة أصلياً — يجب النزول إلى `sql\`...\`` خام.
- ❌ استعلام الـ activities يرجع صفوف غير متجانسة (أعمدة مختلفة لكل جدول) تحتاج عمود `type` تمييزي + parsing في JS.

### 2.3 مقارنة صريحة: Cloudflare Workers vs Vercel

| العامل | Cloudflare Workers (الحالي) | Vercel (البديل) |
|---|---|---|
| **اتصالات DB متزامنة** | محدود ~6 — **يكسر 10 استعلامات الـ dashboard المتوازية** | لا حد عملي — pool `postgres.js` (افتراضي 10) يعمل أصلياً، `Promise.all` يعمل كما صُمّم |
| **Latency إلى Supabase** | edge → Supabase (متغير حسب colo) | serverless fn (قابل للتثبيت في region) → Supabase — يمكن co-locate في نفس الـ region |
| **Cold start** | ~0ms (Workers لا ت cold-start بالمعنى التقليدي) | ~200-500ms على Node.js functions (نادر لمستخدم واحد) |
| **إعداد البنية** | OpenNext + wrangler.toml + Hyperdrive (إن استُخدم) + `nodejs_compat` flag | `vercel.json` اختياري، صفر إعداد لـ Next.js |
| **عبء الصيانة** | OpenNext طبقة توافق يجب أن تتبع إصدارات Next.js؛ Workers لديها فجوات Node API تظهر فجأة | أصلي — Next.js منتج Vercel، دعم من الطبقة الأولى |
| **التكلفة (الطبقة المجانية)** | 100k طلب/يوم | 100k طلب/يوم، 100 GB-hrs compute |
| **توافق `postgres.js`** | حلّ مُعالَج عبر `nodejs_compat`، لكن semanitcs مقابس TCP تختلف عن Node | Node.js runtime أصلي — `postgres.js` يعمل كما هو موثّق |
| **PWA / Serwist** | يعمل، لكن service worker caching على Workers لها حالات حدية | يعمل أصلياً |

### 2.4 التوصية (حاسمة)

## ✅ الانتقال إلى Vercel. لهذا التطبيق والمالك، Vercel هو الهدف الصحيح للنشر.

**المنطق، مُعایَرًا لأولويات المالك (السرعة + صيانة منخفضة + مستخدم واحد):**

#### 1. السرعة هي أولوية المالك المُعلنة

الـ `Promise.all` في الـ dashboard هو البنية الصحيحة للسرعة — يقلّص 10 استعلامات إلى ~1 round-trip. Cloudflare Workers يكسر هذه البنية. تسلسل الاستعلامات (الخيار B) يضحي بهدف السرعة. Hyperdrive (الخيار A) يضيف تعقيد بنية. SQL الموحّد (الخيار C) يضيف عبء صيانة. **Vercel يتيح للبنية الصحيحة العمل أصلياً — صفر حلول بديلة، صفر كلفة أداء.**

#### 2. الصيانة المنخفضة هي أولوية المالك المُعلنة

OpenNext هو shim توافق يجب أن يتبع إصدارات Next.js. التطبيق اصطدم بعدم توافق واحد بالفعل (الاتصالات المتزامنة). مزايا Next.js المستقبلية (Turbopack، partial prerendering، caching جديد) قد تظهر المزيد. **Vercel هو Next.js من الطبقة الأولى — صفر shim، صفر مخاطر توافق.** مالك واحد لا يريد تصحيح أخطاء OpenNext.

#### 3. مقياس المستخدم الواحد لا يحتاج edge الخاص بـ Cloudflare

قيمة Cloudflare هي التوزيع global edge لكثير من المستخدمين المتزامنين. مالك واحد في الأردن لا يستفيد من 300+ edge colo — يصل إلى colo واحد. **دالة serverless ذات region واحد على Vercel (مثبّتة على region Supabase، مثلاً `aws-us-east-1`) تعطي latency أفضل للـ DB من قفزة Cloudflare edge → Supabase.**

#### 4. إعداد Cloudflare نصف مخبوز بالفعل لهذا التطبيق

`open-next.config.ts` يُعطّل incremental cache (`"dummy"`)، tag cache (`"dummy"`)، queue (`"dummy"`) — أي مزايا caching/revalidation في Next.js كلها no-ops على Cloudflare. على Vercel، ISR، tag-based revalidation، و`unstable_cache` كلها تعمل أصلياً. **التطبيق يدفع كلفة توافق Cloudflare دون استخدام المزايا.**

#### 5. التكلفة مكافئة

كلتا الطبقتين المجانيتين تغطيان حمل المستخدم الواحد بسهولة.

#### السبب الوحيد للبقاء على Cloudflare

إذا كان المالك على Cloudflare لأسباب أخرى (حساب موجود، توجيه نطاق، Workers لخدمات أخرى) ويريد كل شيء في مكان واحد. هذا سبب مشروع، لكنه تفضيل تشغيلي وليس ميزة تقنية لهذا التطبيق.

#### إذا أصر المالك على Cloudflare

استخدم **الخيار C (SQL الموحّد)** — هو الخيار الوحيد الذي يحافظ على التوازي (على مستوى الـ hook: 3 استعلامات متزامنة) وهدف السرعة، بلا بنية تحتية جديدة. الخيار A (Hyperdrive) مقبول لكن يضيف اقتراناً سيضطر المالك لصيانته. **لا تستخدم الخيار B (التسلسل) — ينتهك صراحةً أولوية السرعة.**

---

## 3. الجزء 2 — الأداء والتشغيل المستدام

### 3.1 مُعایَرة المقياس

عمل يدوي لمالك واحد: عشرات الطلبات/أسبوع، مئات المنتجات، آلاف السجلات/سنة.

- 50 طلب/أسبوع × 52 أسبوع = 2,600 طلب/سنة
- بعد 3 سنوات: ~8,000 طلب
- مبيعات/مصاريف/مشتريات بنفس المقدار

**هذا ليس مقياس enterprise.** كل توصية أدناه مُعایَرة لهذا — سيتم الإشارة صراحةً إلى الـ over-engineering.

### 3.2 النتائج (مرتبة بالأثر/الجهد)

#### [BLOCKER — انظر الجزء 1] 10 اتصالات DB متزامنة عند تحميل الـ dashboard

- **الموقع:** `dashboard/queries.ts:29, 83, 173`
- **الإصلاح:** الانتقال إلى Vercel (مُفضّل) أو توحيد الاستعلامات (الخيار C)
- **هذا حاجز نشر + قضية الأداء الأعلى تأثيراً معاً.**

#### [HIGH — تم إصلاحه، تحقق] فهارس لـ `purchase.supplier` و `sale.source`

- **الموقع:** `drizzle/migrations/0002_nervous_ego.sql:1-2`
- **النتيجة:** الفهرسان موجودان (partial، `WHERE deleted_at is null`). مؤكد.
- عند 8,000 عملية شراء بفلتر supplier، يحوّل seq scan إلى index scan.
- **يستحق الفعل بهذا المقياس؟** نعم — فهارس low-cardinality partial صغيرة (~few KB) وفلتر supplier مسار استعلام حقيقي. ليس over-engineering.

#### [MEDIUM] `getOrder` يطلق استعلامين متتاليين (order + components)

- **الموقع:** `orders/queries.ts:90-101`
- يمكن أن يكون استعلام واحد بـ left join.
- **الكلفة عند المقياس:** 2 round-trips × 50ms = 100ms لكل عرض تفاصيل. عند مقياس مستخدم واحد، هذا مقبول — الـ detail view يُفتح عرضياً، ليس في hot loop.
- **يستحق الإصلاح؟** لا. join يضيف تعقيد استعلام (Drizzle relational API أو raw SQL join) لكسب 50ms على مسار غير hot. **Over-engineering بهذا المقياس.**

#### [MEDIUM] `getOrders` cursor lookup يطلق استعلام إضافي لكل صفحة

- **الموقع:** `orders/queries.ts:40-44`
- للترقيم، يجلب أولاً `createdAt` لصف cursor، ثم يفلتر.
- هذا نمط keyset-pagination-with-cursor-ID القياسي.
- **الكلفة:** 1 round-trip إضافي لكل "تحميل المزيد" — 50ms. عند مقياس مستخدم واحد (ترقيم عرضي)، ضئيل.
- **يستحق الإصلاح؟** لا. مقارنة tuple `(createdAt, id) < (cursor.createdAt, cursor)` عند `:48` صحيحة ومستقرة. البدائل (تخزين cursor createdAt client-side) تضيف تعقيد client بدون كسب محسوس. **مقبول كما هو.**

#### [LOW — تم إصلاحه] Over-fetching لـ `notes` في استعلامات القوائم

- **الموقع:** `orders/queries.ts:64` و `finance/queries.ts:74`
- الآن تختار `notes: sql<string>\`''\`` (سلسلة فارغة) بدلاً من العمود الحقيقي. عروض القوائم لا تعرض notes، فيوفر ~1KB/row نقل شبكة. عند 20 row/صفحة، ~20KB موفورة.
- **يستحق الفعل؟** نعم، تم بالفعل. طفيف لكن صحيح.

#### [LOW] البحث يستخدم `ilike '%${q}%'` بلا فهرس trigram

- **الموقع:** `orders/queries.ts:32-33`
- الـ wildcard بادية تُعطّل btree.
- **الكلفة عند 8,000 طلب:** ~8,000-row seq scan لكل ضغطة مفتاح بحث (debounced 400ms). عند مقياس مستخدم واحد، ~8,000 rows تُمسح في ~5-10ms على Supabase — غير محسوس.
- **يستحق الإصلاح؟** لا. إضافة `pg_trgm` + GIN index هي الإصلاح "الصحيح" لكنها **over-engineering بهذا المقياس.** الـ scan سريع بما يكفي. أعد النظر إذا وصل المالك لـ ~20,000 طلب أو أبلغ عن بطء البحث.

#### [COMPLIANT] التجميعات في SQL-side

- `dashboard/queries.ts:32, 44, 56` تستخدم `coalesce(sum(...), 0)` في SQL.
- التقارير (`reports/actions.ts`) تستخدم `sum`/`count`/`groupBy` في SQL.
- لا تجميع للصفوف في JS-side. صحيح وقابل للتوسع.

#### [COMPLIANT] الترقيم مُطبّق

- كل استعلامات القوائم تستخدم `.limit(limit + 1)`. لا fetches غير محدودة.

#### [COMPLIANT] المكونات الثقيلة client تُحمّل lazily

- `FinancialChart`, `OrderForm`, `OrderDetail`, تبويبات المالية كلها تستخدم `dynamic(() => import(...), { ssr: false })`. مكتبة الرسم البياني تبقى خارج الـ bundle الرئيسي.

#### [COMPLIANT] أحجام الـ Bundle

- بعد إزالة Sentry، الـ shared bundle هو 104KB. كل المسارات ≤140KB، تحت سقف 150KB. `/orders` عند 133KB لديه أكبر هامش للنمو.

### 3.3 مرور الـ Best Practices

#### ✅ صلب (Solid)

| الجانب | الدليل | الحالة |
|---|---|---|
| سلامة البيانات | soft-delete في كل مكان، CHECK constraints على كل عمود نصي، `set_updated_at` triggers (الآن idempotent عبر `DROP IF EXISTS` في `0002`)، partial unique index على `sale.order_id` يمنع التحويل المزدوج، optimistic concurrency عبر `WHERE id = $1 AND updated_at = $2` (موثق في `orders/actions.ts:222, 304`) | ✅ |
| معالجة الأخطاء | `mapDbError` (`lib/db/errors.ts`) يترجم أكواد Postgres إلى عربية. Server Actions تُرجع discriminated unions. `global-error.tsx` يلتقط أخطاء render. | ✅ |
| سلامة الـ Migrations | كل الـ 3 migrations إضافية (CREATE INDEX, DROP/CREATE TRIGGER). لا عمليات مدمرة. schema.ts يطابق migrations (لا drift). | ✅ |
| معالجة الاتصال | `prepare: false` صحيح لـ Supavisor. `connect_timeout: 10`, `idle_timeout: 30` تمنع التعليق عند idle-pause في Supabase. client مشترك واحد (لا leak لكل طلب). | ✅ |

#### ⚠️ هش (Fragile)

##### [MEDIUM] Supabase free-tier idle-pause

- Supabase يُوقف بعد 7 أيام من عدم النشاط. أول طلب يحصل على خطأ اتصال.
- `mapDbError` يلتقط `ECONNREFUSED` ويُرجع "تعذر الاتصال بقاعدة البيانات — يرجى التأكد من حالة الخادم وحاول مرة أخرى بعد لحظات" — هذا UX صحيح، لكن المستخدم لا يزال يضطر لإعادة المحاولة يدوياً. التطبيق لا يُعيد المحاولة تلقائياً.
- **الإصلاح (جهد منخفض):** أضف `retry: 1` إلى إعداد `postgres`، أو TanStack Query `retry: 1` على hooks الـ dashboard. الاستئناف التلقائي يأخذ ~10-30 ثانية على Supabase؛ إعادة محاولة واحدة تغطي معظم الحالات.
- **يستحق الفعل بهذا المقياس؟** نعم — المالك سيصادف هذا في صباحيات الاثنين.

##### [LOW] لا تجاوز `staleTime` لإحصائيات الـ dashboard

- `query-provider.tsx:16` يضبط `staleTime: 30s` عالمياً. العقد §12.2 يقول الإحصائيات يجب أن تكون 5min.
- عند مقياس مستخدم واحد، 30s تعني الـ dashboard يُعيد الجلب عند كل window focus / فاصل 30s — حمل DB إضافي بلا فائدة (المالك هو المستخدم الوحيد؛ البيانات لا تتغير تحته).
- **الإصلاح:** تجاوز `staleTime: 5 * 60 * 1000` على الـ 3 hooks للـ dashboard.
- **يستحق الفعل؟** نعم — يقلل حمل DB ويسرّع إعادة تحميل الـ dashboard. تغيير تافه.

##### [LOW] `catch (err: any)` في `OrderDetail.tsx:55`

- مرشح biome-ignore. يجب أن يكون `unknown` + narrowing. طفيف.

---

## 4. الجزء 3 — مطابقة نموذج التكلفة (7,000–150,000 فلس)

### 4.1 تأكيد النطاق

7,000 إلى 150,000 فلس = 7.000 إلى 150.000 دينار أردني. موثق ضد الـ schema:

| العمود | النوع | الموقع | الحد الأقصى للقيمة | في النطاق؟ |
|---|---|---|---|---|
| `order.total_price_cents` | `integer` | `orders/db.ts:21` | 2,147,483,647 فلس = 2,147,483 د.أ | ✅ 150,000 فلس = 0.007% من الحد الأقصى |
| `order.total_cost_cents` | `integer` | `orders/db.ts:20` | نفسه | ✅ |
| `order_component.cost_cents` | `integer` | `orders/db.ts:74` | نفسه | ✅ مكون واحد (مثلاً صبار) قد يكون 1,000-30,000 فلس (1-30 د.أ) |
| `purchase.unit_cost_cents` | `integer` | `finance/db.ts` | نفسه | ✅ |
| `expense.amount_cents` | `integer` | `finance/db.ts` | نفسه | ✅ |
| `sale.amount_cents` | `integer` | `finance/db.ts` | نفسه | ✅ |

**لا مخاطر overflow** — 150,000 فلس هو 0.007% من حد الـ integer الأقصى.

### 4.2 تنسيق العرض

**الملف:** `src/lib/money.ts:5-10`

```typescript
export const jodFormatter = new Intl.NumberFormat("ar-JO-u-nu-latn", {
  style: "currency",
  currency: "JOD",
  minimumFractionDigits: JOD_DECIMALS,  // 3
  maximumFractionDigits: JOD_DECIMALS,  // 3
});
```

**النتائج:**
- `formatFilsToJod(7000)` → "7.000 د.أ"
- `formatFilsToJod(150000)` → "150.000 د.أ"
- صحيح لـ JOD بـ 3 خانات عشرية للفلس.

### 4.3 تجربة الإدخال

**الملف:** `src/components/shared/MoneyInput.tsx:82-83`

```tsx
<input
  type="text"
  inputMode="decimal"
  pattern="[0-9.]*"
  ...
  placeholder={placeholder || "0.000"}
/>
```

**سلوك الـ blur (`:66`):**
```typescript
setDisplayValue(parsed.toFixed(3));
```

- كتابة "7" → blur → "7.000"
- كتابة "150" → blur → "150.000"
- كتابة "12.5" → blur → "12.500"

صحيح لنطاق 7-150 د.أ. `inputMode="decimal"` يُظهر لوحة الأرقام العشرية على iOS/Android — موثق صحيح.

### 4.4 التقريب

**الملف:** `src/lib/money.ts:25-57` (`parseJodToFils`)

```typescript
return Math.round(value * 1000);
```

- "7.000" → 7000 فلس (دقيق)
- "12.505" → 12505 فلس (دقيق، لا تقريب مطلوب عند 3 خانات)
- "12.5055" → 12506 فلس (يُقرّب صحيحاً)

لا أخطاء تقريب في نطاق العمل.

### 4.5 الحكم

**لا شيء يُسيء معالجة هذا النطاق.** معالجة المال صحيحة، دقيقة، ومنسّقة جيداً لعناصر 7-150 د.أ.

**ملاحظة UX طفيفة:** `MoneyInput` يقبل قيماً كبيرة بشكل تعسفي (لا سمة `max`). خطأ مطبعي مثل "1500" (1500 د.أ) سيُقبل.
- **الإصلاح (اختياري):** فحص سلامة client-side ناعم (مثلاً تحذير إذا > 500 د.أ) — لكن هذا أداة مستخدم واحد؛ المالك لن يخطئ في 1500 د.أ بانتظام. **لا يستحق الفعل.**

---

## 5. الجزء 4 — ميزة جديدة: قائمة المكونات المعرّفة مسبقاً

### 5.1 قرار التصميم: كتالوج مشترك، ليس وحدة جديدة

**التبرير:** النموذج الذهني للمالك هو "ترتيبة = مكونات بتكاليف". المكونات قابلة لإعادة الاستخدام عبر الطلبات ("وعاء خرساني 7سم" يظهر في مئات الطلبات). هذا **كتالوج مشترك** تستهلكه وحدة الطلبات، ليست وحدة جديدة. يجلس بجانب `orders` و `finance` كميزة نظيرة، لكن بياناته read-only من منظور الطلبات (الطلبات تلتقط لقطة من `default_cost_cents` للمكون وقت الاستخدام). هذا يحافظ على فصل الوحدتين (المكونات لا تلمس المالية؛ فقط `total_cost_cents` للطلب يفعل، الذي يُغذّي جسر البيع اليدوي دون تغيير).

**المجلد:** `src/features/catalog/` بالبنية القياسية (`db.ts`, `schema.ts`, `actions.ts`, `queries.ts`, `hooks.ts`, `components/`).

### 5.2 نموذج البيانات

#### جدول جديد: `component`

```sql
component
  id                  uuid pk default gen_random_uuid()
  name                text not null              check (char_length(name) <= 200)
  default_cost_cents  integer not null            check (default_cost_cents >= 0)
  unit                text not null default 'قطعة'  check (char_length(unit) <= 50)
  -- أمثلة: 'قطعة', 'متر', 'غرام', 'علبة'
  notes               text not null default ''   check (char_length(notes) <= 1000)
  deleted_at          timestamptz null
  created_at          timestamptz not null default now()
  updated_at          timestamptz not null default now()
```

#### الفهرس

```sql
create index component_name_idx on component(name) where deleted_at is null;
```

للبحث في المنتقي.

#### العلاقة مع `order_component`

جدول `order_component` الموجود (`orders/db.ts:66-92`) لديه بالفعل `name`, `cost_cents`, `quantity`. **لا يتغير.** كتالوج المكونات هو **مصدر افتراضي**، ليس foreign key. عندما يختار المالك مكوناً من الكتالوج، النظام ينسخ `name` + `default_cost_cents` إلى صف `order_component` جديد. صف `order_component` مستقل — تعديل تكلفته في طلب واحد لا يؤثر على الكتالوج أو الطلبات الأخرى.

#### لماذا لا FK (`order_component.component_id`)؟

1. `default_cost_cents` للكتالوج يتغير مع الوقت (ارتفاع سعر المورد). الطلبات القديمة يجب أن تحتفظ بالتكلفة التي بُنيت بها.
2. المالك يمكنه تجاوز التكلفة لكل استخدام (وعاء يكلف أكثر في ترتيبة premium).
3. FK يتطلب `ON DELETE SET NULL` (حذف عنصر كتالوج → `order_component.component_id` يُلغى)، وعندئذ `name`/`cost_cents` لـ order_component هي الحقيقة الوحيدة — وهذا بالضبط نموذج اللقطة.
4. إضافة `component_id` إضافية ويمكن عملها لاحقاً إذا أراد المالك تتبّع "أي عنصر كتالوج استُخدم" للتقارير. حالياً، اللقطة (name + cost منسوخ) كافية وتطابق النموذج الذهني.

#### الـ Migration

`0003_component_catalog.sql` — `CREATE TABLE component` إضافي + فهرس + ربط trigger (`set_updated_at`). لا تغييرات على الجداول الموجودة.

### 5.3 سلوك التكلفة الافتراضية + التجاوز

1. المالك يفتح نموذج الطلب، ينقر "إضافة مكوّن" في `ComponentsEditor`.
2. السلوك الحالي: يضيف `{ name: "", costCents: 0, quantity: 1 }` — صف فارغ، المالك يكتب كل شيء.
3. **السلوك الجديد:** النقر على "إضافة مكوّن" يفتح `ResponsiveModal` (bottom sheet على الموبايل) يسرد مكونات الكتالوج (قابلة للبحث، التكلفة الافتراضية معروضة). المالك ينقر مكوناً → يُضاف صف بـ `{ name: catalogComponent.name, costCents: catalogComponent.defaultCostCents, quantity: 1, componentId: catalogComponent.id }`.
4. حقل التكلفة يبقى قابلاً للتعديل (عبر `MoneyInput`) — المالك يمكنه التجاوز لكل استخدام.
5. المالك لا يزال يمكنه إضافة مكون نص حر (ليس في الكتالوج) عبر زر "مكوّن مخصص (يدوي)" في منتقي الـ sheet — يضيف صف فارغ كما كان.

#### معاينة التكلفة

`OrderForm.tsx:73-80` يحسب بالفعل `totalCostCents = sum(component.costCents * component.quantity)`. لا تغيير مطلوب — المعاينة تعمل بشكل مماثل سواء أتى المكون من الكتالوج أو نص حر.

#### لا أثر مالي

`order.total_cost_cents` لا يزال يُحسب في `createOrder`/`updateOrder` (`orders/actions.ts:83-86`) بجمع تكاليف المكونات. الكتالوج لا يلمس المالية. جسر `convertOrderToSale` اليدوي لم يتغير — ينسخ `order.totalPriceCents` (سعر البيع اليدوي)، ليس `totalCostCents`. فصل الوحدتين يصمد.

### 5.4 واجهة CRUD (Mobile-First)

#### صفحة الكتالوج

- **المسار:** `/catalog` — مسار جديد.
- **عنصر تنقّل جديد؟** 5 تبويبات في شريط سفلي كثيرة على الموبايل (4 هو الحد المريح).
- **التوصية:** أضف `/catalog` كمسار. في شريط التبويب السفلي للموبايل، أبقِ 4 تبويبات (Dashboard, Orders, Finance, Reports). الوصول للكتالوج عبر:
  - رابط "المكوّنات" جديد في هيدر صفحة الطلبات (بجانب "طلب جديد")
  - زر "إدارة المكوّنات" في أعلى `ComponentsEditor`

هذا يبقي شريط التبويب عند 4 (يحافظ على إمكانية وصول الإبهام) مع جعل الكتالوج متاحاً من المكانين ذوي الصلة.

#### قائمة الكتالوج

- قائمة بطاقات (مثل الطلبات) — كل بطاقة تعرض: اسم المكون، التكلفة الافتراضية (عبر `AmountText`)، الوحدة، وقائمة 3 نقاط (تعديل/حذف عبر bottom sheet).
- شريط بحث في الأعلى (sticky).
- زر "إضافة مكوّن جديد" FAB أو زر هيدر.

#### نموذج الكتالوج

`ResponsiveModal` (bottom sheet) بـ:
- **الاسم** (text, `inputMode="text"`, `autoCapitalize="words"`)
- **التكلفة الافتراضية** (`MoneyInput`, placeholder "0.000")
- **الوحدة** (text أو picker صغير: قطعة/متر/غرام/علبة)
- **ملاحظات** (textarea, اختياري)

#### منتقي المكونات في OrderForm

عندما ينقر المالك "إضافة مكوّن" في `ComponentsEditor`:
1. افتح `ResponsiveModal` بـ:
   - شريط بحث sticky (`inputMode="text"`)
   - قائمة مكونات الكتالوج (الاسم + التكلفة الافتراضية)
   - النقر للاختيار → يُضاف الصف إلى `useFieldArray`
   - زر "مكوّن مخصص (يدوي)" في الأسفل → يضيف صف فارغ (السلوك الموجود)
2. عند اختيار مكون، يُغلق الـ sheet ويُضاف الصف. التركيز ينتقل إلى حقل التكلفة (ليتمكن المالك من التجاوز فوراً إذا لزم).

### 5.5 UX الموبايل للمنتقي

المنتقي هو تفاعل الموبايل الحرج. التصميم:
- Bottom sheet, full-width, `max-h-[80vh]`.
- بحث sticky في الأعلى (`inputMode="text"`).
- قائمة مكونات قابلة للتمرير — كل صف: اسم (bold), التكلفة الافتراضية (محاذاة لليمين, `AmountText`), الوحدة (muted).
- النقر على صف → يُغلق الـ sheet، يُضاف المكون، ينتقل التركيز لحقل التكلفة.
- "مكوّن مخصص" كزر ghost أسفل القائمة.
- مقبض سحب للإغلاق.

هذا يبدو أصلياً: انقر للإضافة، عدّل إذا لزم، تابع. بيد واحدة، لا modal داخل modal (المنتقي يُغلق قبل تعديل الصف).

---

## 6. الجزء 5 — ميزة جديدة: مكتبة القوالب النصية القابلة للنسخ

### 6.1 قرار التصميم: قسم أداة مستقل

**التبرير:** القوالب النصية لا علاقة لها بالطلبات أو المالية — هي أداة راحة للنسخ واللصق. وضعها داخل أي وحدة سيكون قسرياً. مسار `/snippets` مستقل (أو عنصر تنقّل خامس على الديسكتوب، يُ accessed عبر FAB/رابط على الموبايل) صحيح. النطاق ضيق: المالك طلب "راحة نسخ ولصق، وليس CRM."

**المجلد:** `src/features/snippets/` (بنية قياسية).

### 6.2 نموذج البيانات

#### جدول جديد: `snippet`

```sql
snippet
  id          uuid pk default gen_random_uuid()
  title       text not null              check (char_length(title) <= 200)
  body        text not null              check (char_length(body) <= 2000)
  category    text not null default 'عام'  check (char_length(category) <= 100)
  -- أمثلة: 'وصف منتج', 'ردود عملاء', 'معلومات شحن', 'عروض أسعار'
  deleted_at  timestamptz null
  created_at  timestamptz not null default now()
  updated_at  timestamptz not null default now()
```

#### الفهارس

```sql
create index snippet_category_idx on snippet(category) where deleted_at is null;
create index snippet_title_idx on snippet(title) where deleted_at is null;
```

#### لا علاقة بجداول أخرى

القوالب نص مستقل.

### 6.3 الواجهة (Mobile-First, بسيطة جداً)

#### صفحة القوالب

- **المسار:** `/snippets`
- قائمة بطاقات، مجمّعة حسب الفئة (أو مسطحة مع رقاقات فلتر فئة في الأعلى).
- كل بطاقة: العنوان (bold), معاينة النص (أول سطرين, muted), رقاقة الفئة.
- النقر على بطاقة → يفتح `ResponsiveModal` (bottom sheet) بالنص الكامل + زر **COPY** بارز.
- زر النسخ: `navigator.clipboard.writeText(snippet.body)` → toast "تم النسخ" → الـ sheet يبقى مفتوحاً (يمكن للمالك النسخ مرة أخرى أو الإغلاق).
- الضغط المطول على بطاقة (أو قائمة 3 نقاط) → تعديل/حذف عبر bottom sheet.

#### البحث

- شريط بحث sticky في الأعلى، يفلتر حسب العنوان والنص (client-side `includes` كافٍ بهذا المقياس — لا حاجة لـ SQL `ilike` round-trip مع كل ضغطة مفتاح).

#### إنشاء/تعديل

`ResponsiveModal` بـ:
- **العنوان** (text, `inputMode="text"`)
- **الفئة** (text مع datalist للفئات الموجودة، أو picker صغير)
- **النص** (textarea, أكبر — `min-h-[120px]`)

#### الفئات

- نص حر مع `datalist` للفئات الموجودة (حتى يتمكن المالك من كتابة واحدة جديدة أو اختيار موجودة).
- لا جدول lookup للفئات (over-engineering لـ ~20 قالب).

### 6.4 المتغيرات / العناصر النائبة — تخطّ الآن

المالك طلب راحة نسخ ولصق. المتغيرات (`{customer_name}`, `{product_name}`) تتطلب:
- طبقة templating
- واجهة منتقي متغيرات
- خطوة استبدال قبل النسخ

**هذا scope creep.** إذا أراد المالك لاحقاً "إدراج اسم العميل في قالب"، فهذا تحسين Phase 2 — لكن حالياً، المالك يمكنه لصق القالب وتعديل الاسم يدوياً (يفعل هذا بالفعل). **التوصية: لا متغيرات في Phase 1.** أبقِها بسيطة جداً.

### 6.5 التكامل (ضئيل)

القوالب **لا تكامل** لها مع الطلبات أو المالية. هي أداة مستقلة. نقطة التكامل الوحيدة: زر "نسخ نص" يمكن أن يظهر اختيارياً في منطقة إجراء WhatsApp في OrderDetail — لكن هذا nice-to-have، ليس متطلباً. **تخطّه في Phase 1.**

### 6.6 وصول الموبايل

- 5 تبويبات تنقّل كثيرة على الموبايل.
- الوصول إلى `/snippets` عبر:
  - FAB الضغط المطويل للـ dashboard (أو FAB ثانٍ) — مخفي جداً.
  - رابط "النصوص" في هيدر AppShell على كل الصفحات — يكدّر الهيدر.
  - **الأفضل:** أضف `/snippets` كعنصر خامس على شريط الديسكتوب الجانبي فقط؛ على الموبايل، أضف زر أيقونة "النصوص" صغير في هيدر الـ dashboard (بجانب منتقي الفترة). نقرة واحدة من الشاشة الرئيسية.

---

## 7. الجزء 6 — إعادة تقييم تجربة الموبايل

### 7.1 الحكم

التطبيق genuinely mobile-first ويشبه التطبيق الأصلي. حواجز المراجعة السابقة (أهداف 44px, FAB, hero stat, bottom sheets, لوحات مفاتيح, RTL) كلها حُلّت. "علامات الويب" المتبقية طفيفة.

### 7.2 ما هو صحيح (إحساس التطبيق الأصلي)

| الميزة | الموقع:السطر | الحالة |
|---|---|---|
| **شريط تبويب سفلي, 4 تبويبات** | `AppShell.tsx:96-118` | ✅ متناول بالإبهام, RTL صحيح (أول تبويب على اليمين) |
| **FAB على الـ dashboard** | `DashboardClient.tsx:412-419` | ✅ يفتح bottom sheet بـ 4 إجراءات إنشاء |
| **Bottom sheets على الموبايل, modals على الديسكتوب** | `ResponsiveModal.tsx:36-55` | ✅ مقبض سحب موجود |
| **لوحات مفاتيح موبايل صحيحة** | `OrderForm.tsx:131,156,189,212`; `MoneyInput.tsx:82`; `ComponentsEditor.tsx:90,142` | ✅ text/tel/numeric/decimal حسب الحاجة — لا تبديل لوحة مفاتيح مطلوب |
| **أهداف لمس 44px** | `OrderDetail.tsx:107,117,125,131,141,149`; `OrderForm.tsx:300,308`; `ComponentsEditor.tsx:106,167`; `DashboardClient.tsx:108,120,136` | ✅ جميعها `min-h-[44px] min-w-[44px]` |
| **خصائص RTL منطقية** | grep أكد صفر `pl-/pr-/ml-/mr-/left-/right-` في المكونات المشتركة | ✅ `ps-/pe-/ms-/me-/inset-s-/inset-e-` مستخدمة في كل مكان |
| **قوائم بطاقات على الموبايل** | `OrderList.tsx:191-200` | ✅ يعرض `OrderCard` على الموبايل, جدول على `lg`. تبويبات المالية تتبع نفس النمط |
| **Hero stat** | `DashboardClient.tsx:158-177` | ✅ صافي الربح بـ `text-4xl`, بطاقة hero بعرض كامل |
| **PWA قابل للتثبيت** | manifest + أيقونات (`public/icons/`) + Serwist service worker | ✅ |
| **شريط offline** | `AppShell.tsx:40` | ✅ `z-sticky`, `bg-warn`, 2px |
| **امتثال الـ tokens** | grep وجد صفر `text-red-500`, `bg-primary`, `text-white`, `bg-muted`, `focus:ring-ring` | ✅ كل الـ tokens دلالية (`text-alert`, `bg-ink`, `text-paper`, `bg-info`) |

### 7.3 "علامات الويب" المتبقية (طفيفة)

#### [LOW] Tooltip الرسم البياني hover-only

- **الموقع:** `FinancialChart.tsx` (من المراجعة السابقة, لا يزال موجوداً)
- tooltip التفاصيل اليومية للرسم البياني يستخدم `group-hover:opacity-100`. على الموبايل (لا hover), الـ tooltip غير مرئي — المالك لا يمكنه رؤية التفاصيل اليومية.
- **الإصلاح:** أضف `onClick` toggle على مجموعة الأعمدة يقلب opacity مدفوع بالحالة، أو استخدم `active:opacity-100` للّمس.
- **يستحق الفعل؟** نعم — إصلاح صغير والمالك سيريد رؤية الأرقام اليومية على هاتفه. جهد منخفض.

#### [LOW] لا haptic feedback على الإجراءات الرئيسية

- التطبيقات الأصلية تهتز عند تأكيد الحذف, نجاح النسخ, إلخ. الويب لا يمتلك هذا عالمياً, لكن `navigator.vibrate(10)` يعمل على Android Chrome.
- **الإصلاح (اختياري):** أضف `navigator.vibrate?.(10)` على toast النجاح للنسخ/الحذف.
- **يستحق الفعل؟** هامشي — nice-to-have, ليس حاجزاً. تخطّه ما لم يذكره المالك.

#### [LOW] لا "سحب للتحديث" على القوائم

- التطبيقات الأصلية تتيح السحب للأسفل لتحديث القائمة. الويب لا يمتلك هذا أصلياً (يحتاج مكتبة).
- `refetchOnWindowFocus: false` (`query-provider.tsx:18`) تعني المالك يجب أن ينقر زر تحديث أو يتنقل بعيداً ويعود.
- **الإصلاح (اختياري):** أضف زر "تحديث" صغير في هيدرات القوائم, أو فعّل `refetchOnWindowFocus: true` (رخيص على الموبايل — يحدث refetch عندما يبدل المالك علامة التبويب للمتصفح).
- **يستحق الفعل؟** تفعيل `refetchOnWindowFocus: true` تغيير سطر واحد بقيمة حقيقية — المالك يبدل بين WhatsApp والتطبيق باستمرار؛ التحديث التلقائي عند التركيز يبقي القائمة طازجة. موصى به.

#### [LOW] انتقالات الصفحة فورية

- التطبيقات الأصلية لها انتقالات دقيقة (انزلاق, تلاشٍ) عند التنقل. Next.js App Router لا يضيف هذه افتراضياً. التطبيق يبدو "سريعاً" لكن ليس "شبيهاً بالتطبيق" عند التنقل.
- **الإصلاح (اختياري):** أضف غلاف انتقال صفحة `framer-motion`, أو استخدم `template.tsx` في App Router لتأثيرات الدخول.
- **يستحق الفعل؟** لا — `framer-motion` يضيف ~30KB للـ bundle (ينتهك السقف), والتنقل الفوري في App Router في الواقع مكسب أداء. الإحساس "السريع" صحيح لأداة بيانات. **تخطّه — over-engineering.**

### 7.4 الميزات الجديدة على الموبايل

#### منتقي المكونات (الجزء 4)

منتقي الـ bottom-sheet مع بحث + انقر للإضافة هو نمط الموبايل الصحيح. بيد واحدة: انقر "إضافة" → sheet يرتفع من الأسفل → انقر مكون → sheet يُغلق → الصف يظهر → عدّل التكلفة إذا لزم. يبدو مثل إضافة عناصر لسلة في تطبيق تسوق. أصلي.

#### نسخ القوالب (الجزء 5)

انقر بطاقة → sheet يفتح بالنص الكامل + زر COPY كبير → انقر نسخ → toast "تم النسخ" → الصق في WhatsApp. بيد واحدة, نقرتان للنسخ. زر COPY يجب أن يكون كبيراً (`min-h-[56px]`, عرض كامل, `bg-info text-paper`) — هو الإجراء الأساسي. أصلي.

---

## 8. الجزء 7 — تحسينات استشرافية ضمن النطاق

مُرتبة حسب القيمة/الجهد, مُحددة النطاق لعمل يدوي لمالك واحد (تفضيلات/مناسبات, تخصيص, شحن لكل الأردن, مالك واحد). لا scope creep.

### 8.1 قيمة عالية, جهد منخفض

#### 1. تفعيل `refetchOnWindowFocus: true`

- **الموقع:** `query-provider.tsx:18`
- تغيير سطر واحد. المالك يبدل بين التطبيق وWhatsApp باستمرار؛ التحديث التلقائي عند التركيز يبقي القوائم طازجة بدون تحديث يدوي. صفر كلفة أداء عند مقياس مستخدم واحد. **افعل هذا.**

#### 2. تجاوز `staleTime` إلى 5min على hooks الـ dashboard

- **الموقع:** `dashboard/hooks.ts`
- ثلاث إضافات `staleTime: 5 * 60 * 1000`. يقلل حمل DB على إعادة تحميل الـ dashboard (المالك يعيد فتح التطبيق مرات متعددة/يوم). تافه. **افعل هذا.**

#### 3. أضف `retry: 1` إلى إعداد `postgres`

- **الموقع:** `lib/db/client.ts:7`
- يُعيد المحاولة تلقائياً عند فشل اتصال idle-pause في Supabase. يوفر على المالك إعادة محاولة يدوية في صباحيات الاثنين. سطر واحد. **افعل هذا.**

#### 4. قالب رسالة WhatsApp مع رابط الطلب

- **الموقع:** `lib/whatsapp.ts` حالياً يبني رسالة بـ المنتج/الكمية/السعر.
- **التحسين:** أضف ربح الطلب المُقدّر (للمرجع الداخلي للمالك, ليس للعميل) كـ "ملاحظة داخلية" أسفل الرسالة الموجهة للعميل. أو: أضف زر "نسخ ملخص الطلب" في OrderDetail ينسخ ملخص نص عادي إلى الحافظة — المالك يمكنه لصقه في أي تطبيق, ليس فقط WhatsApp.
- **القيمة:** المالك يتواصل عبر WhatsApp, Instagram DM, و SMS; زر نسخ إلى الحافظة أكثر مرونة من رابط wa.me. جهد منخفض.

### 8.2 قيمة متوسطة, جهد متوسط

#### 5. إجراءات سريعة لـ workflow حالة الطلب

- **الموقع:** `OrderDetail.tsx` حالياً لديه أزرار WhatsApp + Convert-to-Sale.
- **الإضافة:** أزرار تغيير حالة سريعة (draft → sent → confirmed → delivered) كـ stepper أفقي في أعلى تفاصيل الطلب. نقرة واحدة لتقديم الحالة.
- **القيمة:** المالك يتتبع الطلبات عبر مراحل (عرض السعر مُرسل, العميل أكّد, تم التوصيل); stepper أسرع من تعديل النموذج الكامل. جهد متوسط (UI + action `updateOrderStatus`).

#### 6. ملخص طلب للعميل قابل للطباعة/رابط

- المالك يشحن لكل محافظات الأردن. ملخص طلب قابل للطباعة (اسم العميل, المنتج, الكمية, السعر, ملاحظات الشحن) سيساعد في التغليف/التوصيل.
- **لكن:** العقد أزال `@react-pdf/renderer`, والـ PDFs ثقيلة.
- **البديل:** مسار قابل للطباعة (`/orders/[id]/print`) يعرض صفحة HTML نظيفة (CSS `@media print`) المالك يمكنه طباعتها أو حفظها PDF عبر المتصفح. صفر كلفة bundle. جهد متوسط.

#### 7. مصاريف متكررة (إيجار, رواتب)

- المالك لديه مصاريف شهرية ثابتة (إيجار, رواتب). حالياً يدخلها يدوياً كل شهر.
- **التحسين:** checkbox "تكرار شهري" على إنشاء مصروف; Route Handler cron (أو Vercel Cron) يكرر المصروف في أول كل شهر.
- **القيمة:** يوفر 5-10 إدخالات يدوية/شهر. جهد متوسط (يحتاج cron — Vercel Cron مجاني على Pro, أو استخدم Supabase Edge Functions).
- **تحذير:** يستحق فقط إذا أكّد المالك أن لديه ≥3 مصاريف متكررة.

### 8.3 أولوية أقل (تخطّه ما لم يُطلب)

#### 8. النقر للاتصال بهاتف العميل

- `OrderDetail.tsx:166` يعرض الهاتف كنص `dir="ltr"`. يمكن أن يكون رابط `tel:`.
- إصلاح سطر واحد, لكن المالك على الأرجح ينسخ الرقم إلى WhatsApp على أي حال (زر WhatsApp يستخدمه بالفعل). هامشي.

#### 9. مرفقات الطلب (صور الترتيبة)

- المالك قد يريد إرفاق صورة للمنتج النهائي بالطلب.
- **لكن:** يتطلب تخزين ملفات (Supabase Storage أو Vercel Blob), واجهة رفع, تحسين صور. يضيف تعقيداً حقيقياً وكلفة تخزين.
- **تخطّه ما لم يطلب المالك صراحة** — هو scope creep إلى "إدارة الطلبات كـ CRM", الذي استبعد العقد صراحةً.

#### 10. متعدد العملات

- العقد §17 يدرج هذا كتوسع مستقبلي. المالك يبيع بالدينار الأردني فقط (الأردن).
- **تخطّه** حتى يتوسع إلى الخليج/USD.

### 8.4 غير موصى به صراحةً (Over-Engineering بهذا المقياس)

| التحسين | لماذا لا |
|---|---|
| **pg_trgm / فهارس GIN للبحث** | عند <10,000 صف, seq scans <10ms. تخطّه. |
| **تقسيم الجداول (partitioning)** | غير ضروري عند آلاف الصفوف. تخطّه. |
| **نسخ قراءة (read replicas)** | مستخدم واحد, لا ضغط قراءة. تخطّه. |
| **طبقة caching بـ Redis** | TanStack Query + `unstable_cache` تكفي. تخطّه. |
| **قاعدة بيانات العملاء / وحدة المخزون / auth / فواتير / إشعارات** | كلها في §17 توسع مستقبلي, كلها scope creep لأداة مالك واحد. تخطّه حتى يطلب العمل. |
| **`framer-motion` أنيميشن** | 30KB كلفة bundle لكسب UX هامشي. تخطّه. |
| **Edge runtime** | لا فائدة لمستخدم واحد region واحد. تخطّه. |

---

## 9. القرارات النهائية والحكم

### 9.1 (أ) القرار الواحد الذي يجب أن يتخذه المالك أولاً

## اختيار هدف النشر: Vercel أم Cloudflare.

كل شيء آخر يتدفق من هذا. إذا Vercel: استعلامات الـ dashboard المتوازية تعمل أصلياً, النظام سريع كما صُمّم, المالك يمكن أن يتوقف عن محاربة المنصة. إذا Cloudflare: المالك يجب إما أن يقبل تحميلات dashboard أبطأ (استعلامات متسلسلة), يضيف تعقيد Hyperdrive, أو يعيد كتابة استعلامات الـ dashboard كـ SQL موحّد — كلها لاستيعاب قيود منصة لا يمتلكها Vercel.

### توصيتي: Vercel.

لمستخدم واحد, region واحد, تطبيق Next.js حيث السرعة أولوية والصيانة المنخفضة أولوية, Vercel هو طريق المقاومة الأقل وأفضل أداء. Cloudflare Workers منصة متفوقة لحالات استخدام كثيرة (edge global, APIs تزامن عالي) — لكن هذا التطبيق ليس واحداً منها. المالك لا يخدم جمهوراً global; هو شخص واحد في الأردن يدير عمله. دعم Next.js الأصلي في Vercel ووصول DB غير المتزامن هو الملاءمة الصحيحة.

**إذا كان لدى المالك سبب قوي للبقاء على Cloudflare** (بنية تحتية موجودة, توجيه نطاق, كلفة), البديل هو **الخيار C: ادمج استعلامات الـ dashboard الـ 3 (summary) في SQL `UNION ALL` واحد, الـ 4 (activities) في واحد, والـ 3 (trend) في واحد.** هذا يقلّص 10 اتصالات إلى 3, يبقى ضمن سقف Cloudflare, ويحافظ على التوازي على مستوى الـ hook. تغيير كود بساعتين بلا بنية تحتية جديدة.

---

### 9.2 (ب) الميزة/الإصلاح الأعلى قيمة للقيام به لاحقاً

## بعد قرار النشر: نفّذ كتالوج مكونات المنتج المعرّفة مسبقاً (الجزء 4).

**المنطق:** النموذج الذهني الأساسي للمالك هو "ترتيبة = مكونات بتكاليف." حالياً, كل طلب يتطلب إعادة كتابة أسماء المكونات والتكاليف من الذاكرة. المالك لديه ربما 10-15 مكوناً قياسياً (وعاء خرساني 7سم, إيشيفيريا, صندوق كرافت, طباعة UV DTF, حافة قماش) تظهر في معظم الطلبات. كتالوج بتكاليف افتراضية يعني: انقر لإضافة وعاء (التكلفة تملأ تلقائياً 2.500 د.أ), انقر لإضافة صبار (3.000 د.أ), تجاوز إذا لزم, تم. هذا يقطع وقت إدخال الطلب بـ 50-70% ويُلغي أخطاء كتابة التكاليف. هي الميزة الأعلى قيمة لتشغيل المالك اليومي.

أيضاً محددة النطاق جيداً: جدول جديد واحد, وحدة ميزة جديدة واحدة, لا تغييرات على المالية أو جسر البيع, لا scope creep. المنفذ يمكنه بناءها في 1-2 يوم باستخدام `ComponentsEditor` الموجود كنقطة تكامل.

مكتبة القوالب (الجزء 5) أولوية أقل — مفيدة لكن ليست أساسية لتشغيل العمل. افعلها بعد الكتالوج.

---

### 9.3 (ج) الحكم الصريح

## النظام أساس متين ومستدام لهذا العمل. لا يحتاج تغيير هيكلي — يحتاج حل هدف النشر وبناء كتالوج المكونات.

### البنية صحيحة

- feature-sliced
- RSC + Server Actions
- مال كـ integer fils
- soft-delete
- optimistic concurrency
- ترقيم cursor
- مفاتيح idempotency
- partial unique index على جسر البيع
- تجميعات SQL-side

طبقة البيانات نظيفة وتتوسع إلى عشرات الآلاف من السجلات بلا مشكلة. تجربة الموبايل genuinely شبيهة بالتطبيق — لوحات مفاتيح صحيحة, bottom sheets, أهداف 44px, RTL, FAB, hero stat, امتثال tokens. حواجز المراجعات السابقة كلها حُلّت. 27 اختبار ناجح. الـ bundle خفيف (104KB مشترك, كل المسارات ≤140KB).

### المخاطرة الهيكلية الوحيدة

عدم ملاءمة هدف النشر (سقف اتصالات Cloudflare مقابل استعلامات الـ dashboard المتوازية). هذا ليس عيب كود — هو قضية ملاءمة منصة. يُحل بالانتقال إلى Vercel (موصى به) أو توحيد الاستعلامات (بديل Cloudflare). إما طريقاً، إصلاح بساعتين, ليس إعادة هيكلة.

### الميزتان الجديدتان

(كتالوج المكونات, القوالب) إضافيتان وتلائمان البنية الموجودة بنظافة. كتالوج المكونات تحديداً يتماشى تماماً مع النموذج الذهني للمالك وجدول `order_component` الموجود — هو مصدر افتراضي, ليس تغيير هيكلي.

### ما هو غير مطلوب

- auth (بوابة الرمز كافية لأداة مالك واحد)
- multi-user
- CRM
- إدارة مخزون
- pg_trgm
- partitioning
- read replicas
- Redis
- edge runtime

يجب على المالك مقاومة أي اقتراح لإضافة هذه حتى يتجاوز العمل النطاق الحالي. النظام مقصود صغير ومركز — هذه قوته.

### الخلاصة

أصلح هدف النشر, ابنِ كتالوج المكونات, والمالك لديه أداة سريعة, مستدامة, mobile-first تتطابق مع كيفية عمله الفعلي. الأساس يصمد.

---

## ملخص القرارات السريع (سطر واحد لكل قرار)

| # | القرار | البديل المرفوض | السبب |
|---|---|---|---|
| 1 | النشر على Vercel | البقاء على Cloudflare | `Promise.all` في dashboard يعمل أصلياً؛ صفر حلول بديلة؛ صفر كلفة أداء |
| 2 | لو لزم Cloudflare: الخيار C (SQL موحّد) | الخيار B (تسلسل) | يحافظ على التوازي على مستوى الـ hook؛ لا يضحي بالسرعة |
| 3 | كتالوج المكونات = جدول `component` مستقل + لقطة في `order_component` | FK `order_component.component_id` | اللقطة تحتفظ بالتكلفة التاريخية؛ مرونة التجاوز لكل استخدام |
| 4 | الوصول للكتالوج via هيدر الطلبات + زر في ComponentsEditor | تبويب خامس في الشريط السفلي | 4 تبويبات حد مريح للإبهام على الموبايل |
| 5 | مكتبة القوالب = جدول `snippet` مستقل + `/snippets` | دمجها في الطلبات/المالية | لا علاقة بالوحدتين؛ أداة راحة مستقلة |
| 6 | لا متغيرات/placeholders في القوالب (Phase 1) | طبقة templating | scope creep؛ المالك يعدّل يدوياً حالياً |
| 7 | تفعيل `refetchOnWindowFocus: true` | `false` (الحالي) | المالك يبدل بين التطبيق وWhatsApp؛ تحديث تلقائي يبقي القوائم طازجة |
| 8 | تجاوز `staleTime: 5min` على hooks الـ dashboard | 30s (الحالي) | يقلل حمل DB؛ المالك مستخدم واحد |
| 9 | `retry: 1` على `postgres` config | لا retry (الحالي) | auto-retry عند idle-pause في Supabase |
| 10 | لا pg_trgm, لا partitioning, لا read replicas, لا Redis, لا edge | إضافات "للأداء" | over-engineering عند مقياس مستخدم واحد |

---

> **نهاية المراجعة الشاملة.** هذا الملف جاهز للتحميل ويحتوي كل تفاصيل المراجعة الـ 7 أجزاء + القرارات + التوصيات, موثق بـ `ملف:سطر` لكل ادعاء.
