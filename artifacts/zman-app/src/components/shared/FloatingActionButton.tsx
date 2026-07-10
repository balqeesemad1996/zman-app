"use client";

import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function FloatingActionButton({
  onClick,
  label,
  icon: Icon = Plus,
  className,
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "fixed bottom-20 end-4 lg:bottom-6 lg:end-[264px] z-dropdown",
        "w-14 h-14 min-h-[44px] min-w-[44px]",
        "flex items-center justify-center rounded-full shadow-lg",
        "bg-info text-paper transition-transform active:scale-95 hover:scale-105",
        className
      )}
    >
      <Icon className="w-6 h-6 shrink-0" />
    </button>
  );
}
