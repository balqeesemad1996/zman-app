"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface HeaderIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // للوصول (aria-label + title)
  isActive?: boolean; // حالة نشطة (قائمة مفتوحة / فلتر مطبّق)
  badge?: boolean; // نقطة تشير لوجود فلتر مفعّل
}

/**
 * زر أيقونة مربّع موحّد لهيدر الصفحات (بحث/فلتر/إعدادات...).
 * 44px هدف لمس، حواف موحّدة، حالة نشطة، ونقطة إشعار اختيارية.
 */
export const HeaderIconButton = React.forwardRef<
  HTMLButtonElement,
  HeaderIconButtonProps
>(({ label, isActive = false, badge = false, className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "relative w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center shrink-0 transition-all duration-[120ms] ease-out active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info",
        isActive
          ? "border-info bg-info-soft text-info"
          : "border-hairline bg-paper text-ink-2 hover:text-ink hover:bg-canvas",
        className,
      )}
      {...props}
    >
      {children}
      {badge && !isActive && (
        <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-info ring-2 ring-paper" />
      )}
    </button>
  );
});

HeaderIconButton.displayName = "HeaderIconButton";
