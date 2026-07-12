"use client";

import { Info } from "lucide-react";
import { useState } from "react";

/**
 * أيقونة (i) صغيرة تعرض نصاً توضيحياً عند النقر/التحويم.
 * للمستخدم الذي يريد معرفة المزيد دون إغراق الشاشة بالشروحات.
 */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-ink/30 hover:text-info transition-colors"
        aria-label="مزيد من المعلومات"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          className="absolute bottom-full right-0 mb-1 z-50 w-56 p-2.5 rounded-lg bg-ink text-paper text-[11px] leading-relaxed shadow-lg whitespace-normal"
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
}
