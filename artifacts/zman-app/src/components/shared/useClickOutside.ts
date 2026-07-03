"use client";

import { useEffect, type RefObject } from "react";

/**
 * يغلق عنصراً منبثقاً (قائمة/حقل) عند الضغط خارجه أو ضغط Escape.
 * يُستخدم في قوائم الهيدر المنسدلة والبحث المتوسّع.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [ref, onClose, enabled]);
}
