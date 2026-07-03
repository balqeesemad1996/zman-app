"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, helperText, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("w-full space-y-1.5 text-start", containerClassName)}>
        {label && (
          <label className="block text-sm font-bold text-ink-2 select-none">
            {label}
          </label>
        )}
        <div className="relative rounded-md shadow-sm">
          <textarea
            ref={ref}
            className={cn(
              "block w-full min-h-[100px] rounded-md border border-hairline-2 bg-paper p-4 text-base text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 transition-all duration-200 resize-y",
              error && "border-alert focus:border-alert focus:ring-alert/10",
              className
            )}
            {...props}
          />
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

TextArea.displayName = "TextArea";
