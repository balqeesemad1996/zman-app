"use client";

import { useEffect } from "react";

/**
 * يسجّل service worker خفيفاً (public/sw.js) لجعل التطبيق قابلاً للتثبيت (PWA)
 * فيظهر زر التثبيت. الـ SW الجديد لا يعمل precache لملفات ثابتة (كان ذلك سبب
 * أخطاء 404 سابقاً)، بل شبكة أولاً فقط — آمن عند كل نشر جديد.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // تجاهل — عدم التسجيل لا يكسر التطبيق (يفقد فقط قابلية التثبيت)
      });
    };

    // سجّل بعد التحميل الكامل لتفادي منافسة موارد الإقلاع
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
