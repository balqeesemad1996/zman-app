# خطة تسريع نظام Zman المرجعية (PERF_PLAN.md)

هذا المستند يمثل المرجع الأساسي لعمليات تسريع وتحسين الأداء لنظام Zman الداخلي، ويوضح تفاصيل المشاكل، آليات الكاش، التحسينات المعتمدة والقرارات المعمارية.

---

## ١. ملخص تنفيذي: الأسباب الجذرية للبطء

بناءً على التحليل الشامل لكود التطبيق، تم ترتيب الأسباب الجذرية للبطء حسب الأثر التراكمي وتوثيقها كالتالي:

1. **غياب جلب البيانات من جانب الخادم (Server-side Data Fetching) [أثر: عالي جداً]**
   - **التوصيف:** جميع الصفحات الأساسية مثل لوحة التحكم [DashboardClient.tsx:L1](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/dashboard/components/DashboardClient.tsx#L1)، والطلبات، والمالية [FinanceClient.tsx:L1](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/finance/FinanceClient.tsx#L1) هي Client Components بالكامل. البيانات تُجلب بالكامل من المتصفح عبر طلبات Server Actions بعد اكتمال تحميل كود الصفحة.
   - **النتيجة:** يظهر للمستخدم هيكل فارغ (Skeleton) في كل مرة ينتقل فيها لصفحة جديدة بانتظار جلب البيانات.

2. **قصر زمن صلاحية كاش البيانات staleTime [أثر: عالي]**
   - **التوصيف:** تم تعيين staleTime افتراضياً بـ 30 ثانية فقط في [query-provider.tsx:L16](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/providers/query-provider.tsx#L16).
   - **النتيجة:** عند مغادرة أي صفحة والعودة إليها بعد 30 ثانية، تُعتبر البيانات منتهية الصلاحية ويُعاد طلبها من السيرفر بالكامل، مما يسبب loading متكرر ومزعج.

3. **إعادة تركيب غلاف التطبيق (AppShell Remounting) [أثر: عالي]**
   - **التوصيف:** مكوّن `AppShell` ليس موضوعاً في Layout مشترك، بل يتم استدعاؤه بشكل مستقل داخل كل صفحة.
   - **النتيجة:** عند كل عملية تنقل، يتم عمل unmount لـ `AppShell` بالكامل وإعادة تركيب (mount) له من جديد، مما يسبب وميضاً بصرياً (flash) في القوائم العلوية والسفلية وشريط التنقل، ويعيد تشغيل منطق مراقبة حالة الاتصال بالشبكة [AppShell.tsx:L22-L32](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/components/layout/AppShell.tsx#L22-L32).

4. **تأخر التشغيل الأول (Vercel Serverless Cold Starts) والاتصال المباشر بقاعدة البيانات [أثر: متوسط-عالي]**
   - **التوصيف:** إيقاف الـ Prepared Statements في [client.ts:L7-L13](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/lib/db/client.ts#L7-L13) بسبب متطلبات Supabase Supavisor في وضع Transaction pooling، مما يعني حاجة الخادم لتفسير كل استعلام من جديد في كل مرة مع احتمال حدوث cold starts متكرر.

5. **استعلامات متسلسلة (Sequential Waterfalls) [أثر: متوسط]**
   - **التوصيف:** دالة تحميل تقرير الأرباح والخسائر للتحميل [reports/actions.ts:L33-L44](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts#L33-L44) ودالة تفاصيل الطلب `getOrder` في [orders/queries.ts:L120-L138](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/orders/queries.ts#L120-L138) تجلب البيانات بشكل متسلسل ينتظر كل منها الاستعلام السابق.

---

## ٢. جرد آليات التخزين الحالية وما ينقصها

1. **React Query Caching:** مخزن مؤقت في الذاكرة (In-memory) بـ staleTime = 30 ثانية و gcTime = 5 دقائق. **النقص:** يفقد البيانات بالكامل بمجرد إغلاق التطبيق أو تحديث المتصفح، ولا يوجد آلية تخزين مستمر (Persistent).
2. **Next.js Prefetching:** تحميل مسبق لأكواد الـ JS الخاصة بالصفحات تلقائياً عند ظهور الروابط. **النقص:** لا يقوم بتحميل البيانات مسبقاً (Prefetch data).
3. **Service Worker (Serwist):** يقوم بتخزين الأصول الثابتة (Precache) مع استراتيجية NetworkFirst لصفحات HTML والـ RSC. **النقص:** لا يتدخل في طلبات Server Actions المستدعاة من كود React.

---

## ٣. قائمة التحسينات المعتمدة للتمكين والتنفيذ

### ١. زيادة staleTime وتفعيل الكاش الذكي
- **الملف:** [src/providers/query-provider.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/providers/query-provider.tsx)
- **الوصف:** رفع `staleTime` الافتراضي إلى 5 دقائق (`5 * 60 * 1000`) و `gcTime` إلى 30 دقيقة (`30 * 60 * 1000`).
- **المخاطر والتخفيف:** إظهار بيانات قديمة للمستخدم. **التخفيف:** التحقق من أن كل العمليات المعدلة (Mutations) في التطبيق تقوم بإبطال الكاش (Invalidate) فور النجاح.
- **معيار النجاح:** التنقل المتكرر بين الصفحات دون رؤية skeletons، وظهور البيانات بشكل فوري.

### ٢. التخزين الدائم على الهاتف والمتصفح (Persistent Query Client)
- **الملف:** [src/providers/query-provider.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/providers/query-provider.tsx)
- **الوصف:** استخدام `@tanstack/react-query-persist-client` مع `createSyncStoragePersister` و `localStorage` لحفظ الكاش محلياً.
- **المخاطر والأمان:** تسرب بيانات حساسة أو استخدام كاش قديم بعد تحديث النظام. **التخفيف:** تعيين `buster` مساوٍ لإصدار التطبيق لإلغاء الكاش تلقائياً عند النشر الجديد، وضمان عدم وجود استعلامات حساسة مثل كلمات المرور داخل الكاش.
- **معيار النجاح:** إغلاق التطبيق نهائياً وإعادة فتحه لتجد البيانات السابقة تظهر فوراً قبل انتهاء جلب البيانات الجديدة من السيرفر.

### ٣. نقل AppShell إلى Layout مشترك لمنع إعادة التركيب
- **الملف:** إنشاء [src/app/(app)/layout.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/\(app\)/layout.tsx) وتعديل الصفحات لتكون داخله.
- **الوصف:** وضع `AppShell` في Layout مشترك ليبقى ثابتاً أثناء التنقل، مع توفير آلية لإعداد العنوان والأزرار لكل صفحة ديناميكياً باستخدام React Context مبسط.
- **المخاطر والتخفيف:** كسر الـ Middleware أو المصادقة. **التخفيف:** عدم المساس بالـ middleware أو هيكل مسارات `/login` و `/api`؛ إبقاء المسارات الجغرافية كما هي.
- **معيار النجاح:** تنقل انسيابي بين الصفحات دون وميض في القوائم العلوية أو شريط التنقل السفلي.

### ٤. الجلب المسبق الذكي (Prefetching)
- **الملف:** [src/app/(app)/layout.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/\(app\)/layout.tsx) أو AppShell.tsx
- **الوصف:** جلب مسبق للطلبات الأخيرة والملخص المالي عند الديسكتوب hover وعند تركيب التطبيق الأول، مع تحييد الموبايل لتقليل استهلاك البيانات.
- **معيار النجاح:** ظهور الصفحات فورياً عند الضغط عليها.

### ٥. تسريع الاستعلامات وتوازيها
- **الملفات:** [src/features/reports/actions.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/reports/actions.ts) و [src/features/orders/queries.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/features/orders/queries.ts)
- **الوصف:** تحويل استعلامات P&L في `downloadReport` وجلب المكونات في `getOrder` إلى `Promise.all`.
- **معيار النجاح:** انخفاض زمن استجابة التنزيل وفتح تفاصيل الطلب بنسبة تزيد عن 40%.

### ٦. إدراج صفحة التقارير تحت مظلة React Query
- **الملف:** [src/app/reports/page.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/app/reports/page.tsx)
- **الوصف:** استبدال الـ useState والـ useEffect التقليدية بـ `useQuery` للاستفادة من مزايا الكاش والاسترجاع الفوري.
- **معيار النجاح:** ثبات كود الجلب والاستفادة من طبقة الكاش الدائمة.

### ٧. تحسينات prefetch و precache خفيفة
- **الملفات:** [src/components/layout/AppShell.tsx](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/components/layout/AppShell.tsx) و [src/sw.ts](file:///c:/Users/Qaysk/OneDrive/Desktop/Zman%20New/artifacts/zman-app/src/sw.ts)
- **الوصف:** تقليل الـ concurrency في Service worker وتفادي prefetch روابط قائمة "المزيد" المخفية.
- **معيار النجاح:** تقليل استهلاك البيانات والتحميل على المتصفح عند الزيارة الأولى.

---

## ٤. قرارات ومبادئ الأداء المتفق عليها

1. **ضمان عدم التراجع في المظهر والتجربة:** لا يجوز إزالة أي ميزة أو إخفاء عناصر واجهة لتسريع التطبيق.
2. **الحفاظ على حدود حجم الحزم البرمجية:** يجب أن تظل أي صفحة رئيسية في البناء أقل من `150KB`.
3. **أمان البيانات أولاً:** عند استخدام التخزين الدائم (localStorage), يُمنع تخزين أي بيانات اعتماد أو توكنات. البيانات المخزنة هي فقط الكاش التشغيلي المعروض.
4. **التحديث الفوري لكاش Mutations:** أي إضافة أو تعديل أو حذف لبيانات يجب أن يقوم بعمل `invalidate` فوري لـ `queryKeys` المناسبة لضمان تطابق البيانات الفوري مع السيرفر.

---

## ٥. ما لم يتم تنفيذه ولماذا

- **التحويل الكامل للصفحات إلى Server Components:** تم استبعاد هذا التحسين لأن الصفحات الحالية تعتمد بشكل كثيف على حالة تفاعلية معقدة (Interactive tabs, calendars, sheets) مع TanStack hooks معقدة. تحويلها بالكامل لـ Server Components يحمل خطورة عالية لكسر المنطق التشغيلي، ويتطلب إعادة هيكلة تتجاوز الجهد المسموح به للمهمة الحالية. يتم الإبقاء عليه كتحسين مستقبلي مقترح بعد استقرار البنية الحالية.
