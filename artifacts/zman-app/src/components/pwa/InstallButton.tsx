"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "zman_install_dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // تحقق إذا كان المستخدم أخفى الزر في هذه الجلسة
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!mounted) return null;

  // لا تظهر شيئاً إن كان التطبيق مثبّتاً
  if (isStandalone()) return null;

  // لا تظهر إن أخفى المستخدم الزر في هذه الجلسة
  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  // iOS: تلميح يدوي
  if (isIOS() && !deferredPrompt) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-info-soft border border-info/20 px-3 py-2 text-xs text-info">
        <span className="flex-1">للتثبيت: شارك ← أضف إلى الشاشة الرئيسية</span>
        <button
          type="button"
          onClick={handleDismiss}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-info/10 transition-colors -me-1"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // لا حدث مؤجَّل = لا نعرض الزر
  if (!deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null); // يُستهلك لمرة واحدة
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-info-soft border border-info/20 px-3 py-2">
      <button
        type="button"
        onClick={handleInstall}
        className="flex-1 text-sm font-bold text-info hover:text-info/80 transition-colors text-start min-h-[44px] flex items-center"
      >
        تثبيت التطبيق
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-info/10 transition-colors -me-1"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4 text-info/60" />
      </button>
    </div>
  );
}
