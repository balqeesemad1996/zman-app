"use client";

import { Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passcode) {
      setError("الرجاء إدخال رمز الدخول");
      return;
    }

    startTransition(async () => {
      const res = await loginAction(passcode);
      if (res.success) {
        router.refresh();
        router.push("/");
      } else {
        setError(res.error || "حدث خطأ غير متوقع");
      }
    });
  };

  return (
    <div
      className="min-h-dvh bg-canvas text-ink font-sans flex flex-col items-center justify-center p-6"
      dir="rtl"
    >
      <div className="max-w-md w-full bg-paper border border-hairline p-8 rounded-xl shadow-sm space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 bg-info/10 rounded-full flex items-center justify-center text-info mb-1">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-ink">Zman Greens JO</h2>
          <p className="text-xs text-ink-2 leading-relaxed">
            الرجاء إدخال رمز الدخول للوصول إلى لوحة التحكم والبيانات المالية.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="passcode"
              className="text-xs font-semibold text-ink-2"
            >
              رمز الدخول السري
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-ink-2">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="min-h-[44px] ps-10 pe-3 py-2 border border-hairline rounded-md bg-canvas focus:ring-2 focus:ring-ink focus:outline-none w-full text-sm"
                disabled={isPending}
              />
            </div>
            {error && (
              <p className="text-xs font-bold text-alert mt-1 flex items-center gap-1">
                <span>{error}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="min-h-[44px] w-full px-4 py-2 bg-info hover:bg-info/90 text-paper rounded-md font-bold text-sm transition-colors flex items-center justify-center gap-2"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري التحقق...</span>
              </>
            ) : (
              <span>دخول</span>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[10px] text-ink-2 leading-relaxed">
            المشروع مؤمن مؤقتاً لحماية سرية البيانات والعمليات التجارية.
          </p>
        </div>
      </div>
    </div>
  );
}
