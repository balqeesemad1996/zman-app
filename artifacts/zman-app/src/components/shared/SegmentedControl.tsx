"use client";

import { cn } from "@/lib/utils";
import React from "react";

export interface SegmentedOption<T = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T = string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-hairline bg-canvas p-1 gap-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 min-h-[44px] h-11 px-3 rounded-md flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-[120ms] ease-out active:scale-[0.94]",
              isActive
                ? "bg-info text-paper shadow-sm"
                : "text-ink-3 hover:text-ink hover:bg-paper/60"
            )}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            {opt.label && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
