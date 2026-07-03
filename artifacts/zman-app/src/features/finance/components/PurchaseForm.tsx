"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AmountText } from "@/components/shared/AmountText";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { Button } from "@/components/shared/Button";
import { Select } from "@/components/shared/Select";
import { TextArea } from "@/components/shared/TextArea";
import { purchaseInputSchema } from "../schema";
import type { NewPurchase, Purchase } from "../types";
import { usePurchaseItemCatalog } from "../hooks";

interface PurchaseFormProps {
  initialData?: Purchase | null;
  onSubmit: (values: NewPurchase) => void;
  onDelete?: () => void;
  isSubmitting: boolean;
}

export function PurchaseForm({
  initialData,
  onSubmit,
  onDelete,
  isSubmitting,
}: PurchaseFormProps) {
  const formId = useId();
  const [isCustomItem, setIsCustomItem] = useState(!initialData?.item);

  // جلب العناصر الشائعة للمشتريات
  const { data: catalogItems = [] } = usePurchaseItemCatalog();

  const defaultValues = {
    date: initialData
      ? (new Date(initialData.date).toISOString().split("T")[0] ?? "")
      : new Date().toLocaleDateString("en-CA"),
    item: initialData?.item || "",
    supplier: initialData?.supplier || "",
    quantity: initialData?.quantity || 1,
    unitCostCents: initialData?.unitCostCents || 0,
    totalCents: initialData?.totalCents || 0,
    notes: initialData?.notes || "",
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(purchaseInputSchema),
    defaultValues,
  });

  const watchQty = watch("quantity") || 0;
  const watchUnitCost = watch("unitCostCents") || 0;

  // مزامنة المجموع تلقائياً وحساب القيمة
  useEffect(() => {
    const total = Math.round(watchQty * watchUnitCost);
    setValue("totalCents", total);
  }, [watchQty, watchUnitCost, setValue]);

  useEffect(() => {
    if (initialData) {
      setValue(
        "date",
        new Date(initialData.date).toISOString().split("T")[0] ?? "",
      );
      setValue("item", initialData.item);
      setValue("supplier", initialData.supplier || "");
      setValue("quantity", initialData.quantity);
      setValue("unitCostCents", initialData.unitCostCents);
      setValue("totalCents", initialData.totalCents);
      setValue("notes", initialData.notes || "");
      setIsCustomItem(!catalogItems.some((c) => c.name === initialData.item));
    }
  }, [initialData, setValue, catalogItems]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* التاريخ */}
        <div className="space-y-2 flex flex-col">
          <label
            htmlFor={`${formId}-date`}
            className="text-sm font-bold text-ink/75"
          >
            تاريخ الشراء
          </label>
          <input
            id={`${formId}-date`}
            type="date"
            {...register("date")}
            className={`flex h-12 w-full rounded-md border border-hairline bg-paper px-3 py-2 text-base text-ink focus:outline-none focus:ring-2 focus:ring-ink ${
              errors.date ? "border-alert" : ""
            }`}
          />
          {errors.date && (
            <p className="text-xs text-alert mt-1">
              {errors.date.message as string}
            </p>
          )}
        </div>

        {/* بيان المشتريات */}
        <div className="space-y-2 flex flex-col">
          <label
            htmlFor={`${formId}-item`}
            className="text-sm font-bold text-ink/75"
          >
            بيان المواد / الأصناف
          </label>
          {!isCustomItem && catalogItems.length > 0 ? (
            <Select
              id={`${formId}-item-select`}
              value={watch("item")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "custom") {
                  setIsCustomItem(true);
                  setValue("item", "");
                } else {
                  setValue("item", val);
                }
              }}
              error={errors.item?.message as string}
            >
              <option value="">-- اختر الصنف --</option>
              {catalogItems.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value="custom">أخرى (إدخال يدوي) ...</option>
            </Select>
          ) : (
            <div className="flex gap-2 items-center">
              <input
                id={`${formId}-item`}
                type="text"
                inputMode="text"
                autoCapitalize="words"
                placeholder="أدخل اسم الصنف..."
                {...register("item")}
                className={`flex-1 h-12 px-4 py-2 rounded-md border border-hairline-2 bg-paper text-base text-ink focus:outline-none focus:ring-2 focus:ring-ink/10 ${
                  errors.item ? "border-alert" : ""
                }`}
              />
              {catalogItems.length > 0 && (
                <Button
                  onClick={() => {
                    setIsCustomItem(false);
                    setValue("item", catalogItems[0]?.name || "");
                  }}
                  variant="secondary"
                  className="h-12 text-xs text-ink-2 shrink-0 px-3"
                >
                  اختر من القائمة
                </Button>
              )}
            </div>
          )}
          {isCustomItem && errors.item && (
            <p className="text-xs text-alert mt-1">
              {errors.item.message as string}
            </p>
          )}
        </div>

        {/* المورد */}
        <div className="space-y-2 flex flex-col">
          <label
            htmlFor={`${formId}-supplier`}
            className="text-sm font-bold text-ink/75"
          >
            اسم المورد (اختياري)
          </label>
          <input
            id={`${formId}-supplier`}
            type="text"
            placeholder="مثال: مشتل الأردن"
            {...register("supplier")}
            className={`flex h-12 w-full rounded-md border border-hairline-2 bg-paper px-4 py-2 text-base text-ink focus:outline-none focus:ring-2 focus:ring-ink/10 ${
              errors.supplier ? "border-alert" : ""
            }`}
          />
          {errors.supplier && (
            <p className="text-xs text-alert mt-1">
              {errors.supplier.message as string}
            </p>
          )}
        </div>

        {/* الكمية وسعر الوحدة */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 flex flex-col">
            <label
              htmlFor={`${formId}-qty`}
              className="text-sm font-bold text-ink/75"
            >
              الكمية
            </label>
            <input
              id={`${formId}-qty`}
              type="number"
              inputMode="numeric"
              step="any"
              {...register("quantity", { valueAsNumber: true })}
              className={`flex h-12 w-full rounded-md border border-hairline-2 bg-paper px-4 py-2 text-base text-ink focus:outline-none focus:ring-2 focus:ring-ink/10 ${
                errors.quantity ? "border-alert" : ""
              }`}
            />
            {errors.quantity && (
              <p className="text-xs text-alert mt-1">
                {errors.quantity.message as string}
              </p>
            )}
          </div>

          <div className="space-y-2 flex flex-col">
            <label
              htmlFor={`${formId}-unitCost`}
              className="text-sm font-bold text-ink/75"
            >
              سعر الوحدة
            </label>
            <Controller
              name="unitCostCents"
              control={control}
              render={({ field }) => (
                <MoneyInput
                  value={Number(field.value) || 0}
                  onChange={field.onChange}
                  error={errors.unitCostCents?.message as string}
                />
              )}
            />
            {errors.unitCostCents && (
              <p className="text-xs text-alert mt-1">
                {errors.unitCostCents.message as string}
              </p>
            )}
          </div>
        </div>

        {/* الإجمالي */}
        <div className="p-3.5 bg-canvas/30 rounded-lg border border-hairline flex items-center justify-between">
          <span className="text-sm font-bold text-ink-2">إجمالي التكلفة:</span>
          <span className="text-lg font-extrabold text-alert">
            <AmountText amount={watch("totalCents")} />
          </span>
        </div>

        {/* ملاحظات */}
        <TextArea
          label="ملاحظات إضافية"
          id={`${formId}-notes`}
          placeholder=""
          {...register("notes")}
          error={errors.notes?.message as string}
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="ink"
          isLoading={isSubmitting}
          className="flex-1"
        >
          {initialData ? "حفظ التعديلات" : "إضافة المشتريات"}
        </Button>

        {initialData && onDelete && (
          <Button
            variant="icon"
            onClick={onDelete}
            disabled={isSubmitting}
            className="text-alert border-alert hover:bg-alert/5"
            title="حذف المشتريات"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </div>
    </form>
  );
}
