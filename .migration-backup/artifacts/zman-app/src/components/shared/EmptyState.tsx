

import { AlertCircle, FileQuestion } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isFilterResult?: boolean;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  isFilterResult = false,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-hairline-2 rounded-xl bg-paper shadow-sm max-w-md mx-auto my-8">
      {isFilterResult ? (
        <AlertCircle className="w-16 h-16 text-warn mb-4" />
      ) : (
        <FileQuestion className="w-16 h-16 text-info mb-4" />
      )}

      <h3 className="text-lg font-bold text-ink mb-2 leading-tight">{title}</h3>
      <p className="text-sm text-ink-2 mb-6 leading-relaxed max-w-xs">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-[44px] px-6 py-2.5 rounded-md bg-info text-paper font-bold hover:bg-info/90 transition-colors text-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
