"use client";
import { ResponsiveModal } from "./ResponsiveModal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "تأكيد الحذف",
  cancelLabel = "إلغاء",
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  return (
    <ResponsiveModal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-ink/70 leading-relaxed text-right">{message}</p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 min-h-[44px] py-2 px-4 rounded-md border border-hairline text-ink/75 hover:bg-canvas font-semibold transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 min-h-[44px] py-2 px-4 rounded-md bg-alert text-paper font-bold hover:bg-alert/90 transition-colors disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
