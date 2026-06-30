

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({
  message = "فشل تحميل البيانات. يرجى التحقق من الاتصال بالإنترنت والتحقق من صلاحية الخادم.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="p-6 border border-alert/20 rounded-xl bg-alert-soft/50 text-center max-w-md mx-auto my-8 flex flex-col items-center justify-center shadow-sm">
      <AlertTriangle className="w-12 h-12 text-alert mb-3" />
      <h3 className="text-base font-bold text-alert-deep mb-2">
        خطأ في الشبكة
      </h3>
      <p className="text-sm text-ink-2 mb-6 leading-relaxed max-w-xs">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] px-6 py-2 rounded-md bg-alert text-paper font-bold hover:bg-alert/90 transition-colors text-sm flex items-center gap-2 justify-center"
      >
        <RefreshCw className="w-4 h-4" />
        <span>إعادة المحاولة</span>
      </button>
    </div>
  );
}
