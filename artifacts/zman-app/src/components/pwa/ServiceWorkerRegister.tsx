"use client";

import { useEffect } from "react";

/**
 * يُلغي تسجيل أي service worker قديم ويمسح كاشه.
 * الـ SW السابق (sw.js) كان نسخة يدوية عالقة تحاول precache ملفات نُشرت
 * سابقاً (404 بعد كل نشر جديد)، مما سبّب أخطاء bad-precaching-response
 * ومشاكل في تحميل الشاشات. النظام لا يحتاج offline، فالأنظف تعطيله كلياً.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // إلغاء تسجيل كل الـ service workers القديمة
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      })
      .catch(() => {
        // تجاهل — لا نكسر الصفحة
      });

    // مسح كل الكاش القديم (precache/runtime)
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {
          // تجاهل
        });
    }
  }, []);

  return null;
}
