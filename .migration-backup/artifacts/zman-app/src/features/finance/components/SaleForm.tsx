

import { zodResolver } from "@hookform/resolvers/zod";
import { Link as LinkIcon, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { saleInputSchema } from "../schema";
import type { NewSale, Sale } from "../types";

interface SaleFormProps {
  initialData?: Sale | null;
  onSubmit: (values: NewSale) => void;
  onDelete?: () => void;
  isSubmitting: boolean;
}

export function SaleForm({
  initialData,
  onSubmit,
  onDelete,
  isSubmitting,
}: SaleFormProps) {
  const formId = useId();

  const defaultValues = {
    date: initialData
      ? (new Date(initialData.date).toISOString().split("T")[0] ?? "")
      : new Date().toLocaleDateString("en-CA"),
    source: (initialData?.source as "manual" | "order") || "manual",
    orderId: (initialData?.orderId as string | null) || null,
    amountCents: initialData?.amountCents || 0,
    description: initialData?.description || "",
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(saleInputSchema),
    defaultValues,
  });

  useEffect(() => {
    if (initialData) {
      setValue(
        "date",
        new Date(initialData.date).toISOString().split("T")[0] ?? "",
      );
      setValue(
        "source",
        (initialData.source as "manual" | "order") || "manual",
      );
      setValue("orderId", initialData.orderId);
      setValue("amountCents", initialData.amountCents);
      setValue("description", initialData.description);
    }
  }, [initialData, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* التاريخ */}
        <div className="space-y-2 flex flex-col">
          <label
            htmlFor={`${formId}-date`}
            className="text-sm font-bold text-ink/75"
          >
            تاريخ البيع
          </label>
          <input
            id={`${formId}-date`}
            type="date"
            {...register("date")}
            className={`flex h-11 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink ${
              errors.date ? "border-alert" : ""
            }`}
          />
          {errors.date && (
            <p className="text-xs text-alert mt-1">
              {errors.date.message as string}
            </p>
          )}
        </div>

        {/* المصدر */}
        <input type="hidden" {...register("source")} />

        {/* إذا كان مرتبط بطلب */}
        {initialData?.orderId && (
          <div className="p-3 bg-canvas/40 rounded-lg flex items-center justify-between border border-hairline text-sm">
            <span className="text-ink/60 flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4" />
              مرتبط بالطلب:
            </span>
            <Link
              href={`/orders?view=${initialData.orderId}`}
              className="text-info font-bold hover:underline"
            >
              عرض تفاصيل الطلب الأصلي
            </Link>
          </div>
        )}

        {/* القيمة */}
        <div className="space-y-2 flex flex-col">
          <label
            htmlFor={`${formId}-amount`}
            className="text-sm font-bold text-ink/75"
          >
            المبلغ المستلم
          </label>
          <Controller
            name="amountCents"
            control={control}
            render={({ field }) => (
              <MoneyInput
                value={Number(field.value) || 0}
                onChange={field.onChange}
                disabled={!!initialData?.orderId || isSubmitting}
                error={errors.amountCents?.message as string}
              />
            )}
          />
          {errors.amountCents && (
            <p className="text-xs text-alert mt-1">
              {errors.amountCents.message as string}
            </p>
          )}
          {initialData?.orderId && (
            <p className="text-xs text-ink/60 mt-1">
              * تم قفل المبلغ وتعديله تلقائياً بناءً على سعر الطلب الأصلي المتفق
              عليه.
            </p>
          )}
        </div>

        {/* الوصف */}
        <div className="space-y-2 flex flex-col">
          <label
            htmlFor={`${formId}-description`}
            className="text-sm font-bold text-ink/75"
          >
            بيان وتفاصيل البيع
          </label>
          <textarea
            id={`${formId}-description`}
            placeholder="وصف المبيعات"
            {...register("description")}
            className={`flex min-h-[80px] w-full rounded-md border border-hairline bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink ${
              errors.description ? "border-alert" : ""
            }`}
          />
          {errors.description && (
            <p className="text-xs text-alert mt-1">
              {errors.description.message as string}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-12 bg-ink text-paper rounded-md flex items-center justify-center gap-1.5 text-md font-bold shadow-sm hover:bg-ink/90 disabled:opacity-50 transition-colors"
        >
          {isSubmitting
            ? "جاري الحفظ..."
            : initialData
              ? "حفظ التعديلات"
              : "إضافة مبيعات"}
        </button>

        {initialData && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isSubmitting}
            className="h-12 w-12 border border-alert text-alert rounded-md flex items-center justify-center hover:bg-alert/5 disabled:opacity-50 transition-colors"
            title="حذف المبيعات"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  );
}
