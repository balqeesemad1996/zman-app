"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, children, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("w-full space-y-1.5 text-start", containerClassName)}>
        {label && (
          <label className="block text-sm font-bold text-ink-2 select-none">
            {label}
          </label>
        )}
        <div className="relative rounded-md shadow-sm">
          <select
            ref={ref}
            className={cn(
              "block w-full h-12 rounded-md border border-hairline-2 bg-paper px-4 pe-10 text-base text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 transition-all duration-200 appearance-none cursor-pointer",
              error && "border-alert focus:border-alert focus:ring-alert/10",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute inset-y-0 end-0 pe-4 flex items-center pointer-events-none text-ink-3">
            <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <title>سهم القائمة</title>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-xs font-semibold text-alert mt-1 select-none animate-fadeIn">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-ink-3 mt-1 select-none">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
