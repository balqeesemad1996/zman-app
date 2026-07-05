// Service worker خفيف — غرضه الوحيد جعل التطبيق "قابلاً للتثبيت" (PWA installable)
// حتى يظهر زر التثبيت (beforeinstallprompt يحتاج SW فعّالاً + manifest صحيح).
//
// لا precache لملفات محدّدة (كان ذلك سبب أخطاء 404/bad-precaching-response سابقاً
// بعد كل نشر). هذا SW لا يخزّن قوائم ملفات ثابتة، فلا يتعطّل عند النشر الجديد.
// الشبكة أولاً دائماً؛ لا offline caching معقّد — النظام أونلاين بطبيعته.

const VERSION = "zman-sw-v1";

self.addEventListener("install", () => {
  // فعّل النسخة الجديدة فوراً دون انتظار إغلاق كل التبويبات
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // نظّف أي كاش قديم من نسخ SW سابقة (precache معطوب)
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// معالج fetch بسيط: الشبكة أولاً، بلا تخزين ملفات ثابتة.
// وجود المعالج شرط لاعتبار الموقع قابلاً للتثبيت في Chrome/Android.
self.addEventListener("fetch", (event) => {
  // نتعامل فقط مع طلبات GET من نفس الأصل؛ الباقي يمرّ للشبكة كما هو
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        caches.match(event.request).then((cached) => cached ?? Response.error()),
    ),
  );
});
