import { useForm, Controller } from "react-hook-form";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { Trash2 } from "lucide-react";
import type { CatalogComponent, NewCatalogComponent } from "../types";

interface CatalogFormProps {
  initialData?: CatalogComponent;
  onSubmit: (values: NewCatalogComponent) => Promise<void>;
  onDelete?: () => Promise<void>;
  isSubmitting?: boolean;
}

const UNITS = ["قطعة", "متر", "غرام", "علبة", "كيلو", "لتر", "ورقة"];

export function CatalogForm({ initialData, onSubmit, onDelete, isSubmitting }: CatalogFormProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<NewCatalogComponent>({
    defaultValues: {
      name: initialData?.name ?? "",
      defaultCostCents: initialData?.defaultCostCents ?? 0,
      unit: initialData?.unit ?? "قطعة",
      notes: initialData?.notes ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      {/* اسم المكوّن */}
      <div>
        <label className="text-xs font-semibold text-ink/60 block mb-1">اسم المكوّن *</label>
        <input
          type="text"
          inputMode="text"
          placeholder="اسم المكوّن"
          {...register("name", { required: "الاسم مطلوب" })}
          className="w-full h-12 px-4 rounded-md border border-hairline focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base"
        />
        {errors.name && <span className="text-xs text-alert mt-1 block">{errors.name.message}</span>}
      </div>

      {/* التكلفة الافتراضية والوحدة */}
      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={control}
          name="defaultCostCents"
          render={({ field: { value, onChange } }) => (
            <MoneyInput
              label="التكلفة الافتراضية"
              value={value}
              onChange={onChange}
              placeholder="0.000"
            />
          )}
        />
        <div>
          <label className="text-xs font-semibold text-ink/60 block mb-1">الوحدة</label>
          <select
            {...register("unit")}
            className="w-full h-12 px-4 rounded-md border border-hairline focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ملاحظات */}
      <div>
        <label className="text-xs font-semibold text-ink/60 block mb-1">ملاحظات (اختياري)</label>
        <textarea
          {...register("notes")}
          placeholder="ملاحظات"
          rows={3}
          className="w-full px-4 py-3 rounded-md border border-hairline focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base resize-none"
        />
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 min-h-[48px] bg-ink text-paper rounded-md font-bold text-sm disabled:opacity-60 transition-colors hover:bg-ink/90"
        >
          {isSubmitting ? "جاري الحفظ..." : initialData ? "حفظ التعديلات" : "إضافة للكتالوج"}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isSubmitting}
            className="min-h-[48px] px-4 rounded-md border border-alert text-alert hover:bg-alert/10 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
