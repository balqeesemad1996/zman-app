import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AmountText } from "@/components/shared/AmountText";
import { MoneyInput } from "@/components/shared/MoneyInput";
import type { CreateOrderInput, UpdateOrderInput } from "../schema";
import { ORDER_STATUSES, createOrderSchema, orderStatusLabels, updateOrderSchema } from "../schema";
import type { OrderWithComponents } from "../types";
import { ComponentsEditor } from "./ComponentsEditor";

interface OrderFormProps {
  initialData?: OrderWithComponents | null;
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

export function OrderForm({ initialData, onSubmitSuccess, onCancel }: OrderFormProps) {
  const isEditMode = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId] = useState(() =>
    typeof window !== "undefined" ? window.crypto.randomUUID() : "",
  );

  const schema = isEditMode ? updateOrderSchema : createOrderSchema;

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: isEditMode
      ? {
          id: initialData.id,
          updatedAt: initialData.updatedAt || "",
          status: initialData.status,
          customerName: initialData.customerName,
          customerPhone: initialData.customerPhone,
          productName: initialData.productName,
          quantity: initialData.quantity,
          components: (initialData.components || []).map((c) => ({
            id: c.id,
            name: c.name,
            costCents: c.unitCostCents,
            quantity: c.quantity,
          })),
          overheadCostCents: initialData.overheadCostCents ?? 0,
          totalPriceCents: initialData.totalPriceCents,
          notes: initialData.notes || "",
        }
      : {
          requestId,
          customerName: "",
          customerPhone: "",
          productName: "",
          quantity: 1,
          components: [],
          overheadCostCents: 0,
          totalPriceCents: 0,
          notes: "",
        },
  });

  const watchedComponents = (watch("components") || []) as Array<{
    costCents?: number;
    quantity?: number;
  }>;
  const watchedOverhead = Number(watch("overheadCostCents") || 0);
  const watchedPrice = Number(watch("totalPriceCents") || 0);

  const componentsCostCents = watchedComponents.reduce((sum, c) => {
    return sum + (Number(c?.costCents) || 0) * (Number(c?.quantity) || 1);
  }, 0);
  const netCostCents = componentsCostCents + watchedOverhead;
  const profitCents = watchedPrice - netCostCents;
  const profitPct =
    watchedPrice > 0 ? Math.round((profitCents / watchedPrice) * 100) : null;

  const onSubmit = async (data: CreateOrderInput | UpdateOrderInput) => {
    setIsSubmitting(true);
    try {
      const { createOrder, updateOrder } = await import("../actions");
      const response = isEditMode
        ? await updateOrder(data as UpdateOrderInput)
        : await createOrder(data as CreateOrderInput);

      if (response.status === "ok") {
        toast.success(isEditMode ? "تم تحديث الطلب بنجاح" : "تم إنشاء الطلب بنجاح");
        onSubmitSuccess();
      } else {
        toast.error(response.message || "حدث خطأ أثناء الحفظ");
      }
    } catch (_error) {
      toast.error("فشل الاتصال بالسيرفر. يرجى التحقق من الشبكة");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-xl mx-auto pb-20 lg:pb-0"
    >
      {/* القسم الأول: بيانات العميل */}
      <div className="bg-paper p-6 rounded-lg border border-hairline shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-ink border-b border-hairline pb-2">
          بيانات العميل
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="customer-name" className="text-sm font-semibold text-ink-2">
              اسم العميل
            </label>
            <input
              id="customer-name"
              type="text"
              inputMode="text"
              autoCapitalize="words"
              autoComplete="name"
              {...register("customerName")}
              className="w-full h-12 px-4 rounded-md border border-hairline-2 focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base leading-tight py-2.5 transition-colors"
            />
            {errors.customerName?.message && (
              <span className="text-xs text-alert">{errors.customerName.message as string}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="customer-phone" className="text-sm font-semibold text-ink-2">
              رقم الهاتف
            </label>
            <input
              id="customer-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              {...register("customerPhone")}
              className="w-full h-12 px-4 rounded-md border border-hairline-2 focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base leading-tight py-2.5 transition-colors"
            />
            {errors.customerPhone?.message && (
              <span className="text-xs text-alert">{errors.customerPhone.message as string}</span>
            )}
          </div>
        </div>
      </div>

      {/* القسم الثاني: تفاصيل المنتج */}
      <div className="bg-paper p-6 rounded-lg border border-hairline shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-ink border-b border-hairline pb-2">
          تفاصيل الطلب
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 flex flex-col gap-1">
            <label htmlFor="product-name" className="text-sm font-semibold text-ink-2">
              اسم المنتج المطلوب
            </label>
            <input
              id="product-name"
              type="text"
              inputMode="text"
              {...register("productName")}
              className="w-full h-12 px-4 rounded-md border border-hairline-2 focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base leading-tight py-2.5 transition-colors"
            />
            {errors.productName?.message && (
              <span className="text-xs text-alert">{errors.productName.message as string}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="quantity" className="text-sm font-semibold text-ink-2">
              الكمية
            </label>
            <input
              id="quantity"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              {...register("quantity", { valueAsNumber: true })}
              className="w-full h-12 px-4 rounded-md border border-hairline-2 focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base leading-tight py-2.5 transition-colors"
            />
            {errors.quantity?.message && (
              <span className="text-xs text-alert">{errors.quantity.message as string}</span>
            )}
          </div>
        </div>
      </div>

      {/* القسم الثالث: مكوّنات التكلفة */}
      <div className="bg-paper p-6 rounded-lg border border-hairline shadow-sm">
        <ComponentsEditor
          control={control}
          register={register}
          getValues={getValues}
          errors={errors}
        />
      </div>

      {/* القسم الرابع: التكاليف الإضافية على مستوى الطلب */}
      <div className="bg-paper p-6 rounded-lg border border-hairline shadow-sm space-y-3">
        <div>
          <h3 className="text-lg font-bold text-ink">تكاليف إضافية</h3>
          <p className="text-sm text-ink-3 mt-0.5">
            تكاليف تطبّق على الطلب كاملاً كالتوصيل والتغليف وما شابه
          </p>
        </div>
        <Controller
          control={control}
          name="overheadCostCents"
          render={({ field: { value, onChange } }) => (
            <MoneyInput
              label="قيمة التكاليف الإضافية"
              value={value}
              onChange={onChange}
              error={errors.overheadCostCents?.message as string}
            />
          )}
        />
      </div>

      {/* القسم الخامس: حالة الطلب (وضع التعديل) */}
      {isEditMode && (
        <div className="bg-paper p-6 rounded-lg border border-hairline shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-ink border-b border-hairline pb-2">
            حالة الطلب
          </h3>
          <div className="flex flex-col gap-1">
            <label htmlFor="order-status" className="text-sm font-semibold text-ink-2">
              الحالة الحالية
            </label>
            <select
              id="order-status"
              {...register("status")}
              className="w-full h-12 px-4 rounded-md border border-hairline-2 focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base transition-colors"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{orderStatusLabels[s]}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* القسم السادس: السعر والملاحظات */}
      <div className="bg-paper p-6 rounded-lg border border-hairline shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-ink border-b border-hairline pb-2">
          التسعير والاتفاق
        </h3>

        <Controller
          control={control}
          name="totalPriceCents"
          render={({ field: { value, onChange } }) => (
            <MoneyInput
              label="السعر المتفق عليه مع العميل"
              value={value}
              onChange={onChange}
              error={errors.totalPriceCents?.message as string}
            />
          )}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-semibold text-ink-2">
            ملاحظات الطلب
          </label>
          <textarea
            id="notes"
            rows={3}
            {...register("notes")}
            className="w-full px-4 py-3 rounded-md border border-hairline-2 focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base transition-colors"
          />
          {errors.notes?.message && (
            <span className="text-xs text-alert">{errors.notes.message as string}</span>
          )}
        </div>
      </div>

      {/* القسم السابع: ملخص مالي */}
      <div className="bg-paper rounded-lg border border-hairline shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-hairline">
          <h3 className="text-lg font-bold text-ink">الملخص المالي</h3>
        </div>
        <div className="divide-y divide-hairline">
          <SummaryRow label="تكلفة المكوّنات" value={componentsCostCents} />
          {watchedOverhead > 0 && (
            <SummaryRow label="تكاليف إضافية" value={watchedOverhead} />
          )}
          <SummaryRow label="صافي التكلفة الإجمالية" value={netCostCents} bold />
          <SummaryRow label="السعر المتفق عليه" value={watchedPrice} />
        </div>
        <div
          className={`px-6 py-5 flex items-center justify-between ${
            profitCents >= 0 ? "bg-success-soft" : "bg-alert-soft"
          }`}
        >
          <div className="flex items-center gap-2">
            {profitCents > 0 ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : profitCents < 0 ? (
              <TrendingDown className="w-5 h-5 text-alert" />
            ) : (
              <Minus className="w-5 h-5 text-ink-3" />
            )}
            <span className="text-base font-bold text-ink">
              {profitCents >= 0 ? "صافي الربح" : "صافي الخسارة"}
            </span>
          </div>
          <div className="text-end">
            <span
              className={`text-xl font-bold ${
                profitCents > 0
                  ? "text-success"
                  : profitCents < 0
                    ? "text-alert"
                    : "text-ink-3"
              }`}
            >
              <AmountText amount={Math.abs(profitCents)} />
            </span>
            {profitPct !== null && (
              <span className="text-xs text-ink-3 block">
                {profitPct}% من السعر
              </span>
            )}
          </div>
        </div>
      </div>

      {/* أزرار الحفظ */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-paper/90 backdrop-blur-md border-t border-hairline flex gap-3 lg:static lg:p-0 lg:bg-transparent lg:border-none z-40 lg:z-auto">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 min-h-[44px] py-3 px-4 rounded-md border border-hairline-2 text-ink-2 hover:bg-canvas font-semibold transition-colors disabled:opacity-50"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 min-h-[44px] py-3 px-4 rounded-md bg-info text-paper font-bold hover:bg-info/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <span>حفظ الطلب</span>
          )}
        </button>
      </div>
    </form>
  );
}

function SummaryRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <span className={`text-sm ${bold ? "font-bold text-ink" : "text-ink-2"}`}>
        {label}
      </span>
      <span className={`text-sm ${bold ? "font-bold text-ink" : "text-ink-2"}`}>
        <AmountText amount={value} />
      </span>
    </div>
  );
}
