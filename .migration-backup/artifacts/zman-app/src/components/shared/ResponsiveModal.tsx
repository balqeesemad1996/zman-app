

import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
}: ResponsiveModalProps) {
  // منع التمرير للخلفية عند فتح المودال
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-sheet flex items-end justify-center lg:items-center"
      role="dialog"
      aria-modal="true"
    >
      {/* الخلفية الداكنة للغطاء (Backdrop) - تغطي شريط التنقل السفلي بالكامل بفضل z-sheet (§9.3) */}
      <div
        className="fixed inset-0 bg-ink/40 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* نافذة المودال المتجاوبة */}
      <div
        className={cn(
          "relative w-full bg-paper z-sheet flex flex-col focus:outline-none transition-transform duration-200 ease-out",
          // تصميم الهاتف: شيت سفلي يفتح من أسفل إلى أعلى بحد أقصى 90% من الشاشة (§9.3)
          "rounded-t-xl max-h-[90vh] pb-safe lg:rounded-t-none lg:pb-0",
          // تصميم الديسكتوب: مودال متمركز في منتصف الشاشة بعرض أقصى 480px (§9.3)
          "lg:rounded-lg lg:max-w-[480px] lg:w-full lg:max-h-[85vh] lg:shadow-xl",
        )}
      >
        {/* مقبض السحب للهاتف لإعطاء إحساس التطبيقات الأصلية (Drag Handle) (§9.3) */}
        <div className="flex justify-center py-2 lg:hidden">
          <div className="w-10 h-1 bg-hairline-2 rounded-full" />
        </div>

        {/* ترويسة المودال */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <h3 className="text-lg font-bold text-ink leading-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -me-2 rounded-full hover:bg-canvas text-ink-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى المودال القابل للتمرير */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
