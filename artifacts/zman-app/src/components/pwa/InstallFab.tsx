"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * زر تثبيت دائري ذكي لشاشة الدخول:
 * - لا يظهر أثناء تحميل النظام (ينتظر mount + حدث التثبيت).
 * - لا يظهر إن كان التطبيق مثبّتاً أصلاً (standalone).
 * - يظهر فقط حين يصبح التطبيق قابلاً للتثبيت (beforeinstallprompt) —
 *   يشمل من حذف التطبيق سابقاً (المتصفح يعيد إطلاق الحدث بعد فترة).
 */
export function InstallFab() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // لا يظهر: أثناء التحميل (لا حدث بعد)، أو إن كان مثبّتاً، أو بعد التثبيت
  if (installed || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="flex flex-col items-center gap-1.5 animate-fade-in">
      <button
        type="button"
        onClick={handleInstall}
        aria-label="تثبيت التطبيق على الجهاز"
        title="تثبيت التطبيق"
        className="w-14 h-14 rounded-full bg-info text-paper shadow-lg flex items-center justify-center hover:bg-info/90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2"
      >
        <Download className="w-6 h-6" />
      </button>
      <span className="text-[11px] font-semibold text-info">تثبيت التطبيق</span>
    </div>
  );
}
