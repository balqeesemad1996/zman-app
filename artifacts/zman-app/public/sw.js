// Service worker مُعطّل — يُلغي نفسه ويمسح كل الكاش القديم.
// كان الـ SW السابق يسبّب أخطاء bad-precaching-response (ملفات 404 من نشر قديم).
// النظام لا يحتاج offline، فهذا الملف يزيل أي SW عالق من أجهزة المستخدمين.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll();
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});
