import { useState } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { MoneyInput } from "@/components/shared/MoneyInput";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { CatalogPicker } from "@/features/catalog/components/CatalogPicker";
import type { CatalogComponent } from "@/features/catalog/types";

interface ComponentsEditorProps {
  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form control binding
  control: any;
  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form register binding
  register: any;
  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form getValues binding
  getValues: any;
  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form errors binding
  errors: any;
}

export function ComponentsEditor({
  control,
  register,
  getValues,
  errors,
}: ComponentsEditorProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { fields, append, remove, insert } = useFieldArray({
    control,
    name: "components",
  });

  const handleRemove = (index: number) => {
    const valueToRestore = getValues(`components.${index}`);
    remove(index);
    toast.error("تم حذف المكوّن", {
      action: {
        label: "تراجع",
        onClick: () => { insert(index, valueToRestore); },
      },
      duration: 5000,
    });
  };

  const handleSelectFromCatalog = (item: CatalogComponent) => {
    append({ name: item.name, costCents: item.defaultCostCents, quantity: 1 });
    setIsPickerOpen(false);
  };

  const handleAddManual = () => {
    append({ name: "", costCents: 0, quantity: 1 });
    setIsPickerOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-ink-2">
          مكوّنات الطلب وتكلفة المواد
        </h4>
        <span className="text-xs text-ink-3">
          تكلفة كل قطعة فرعية تدخل في صناعة المنتج
        </span>
      </div>

      {fields.length === 0 ? (
        <div className="border border-dashed border-hairline-2 rounded-lg p-6 text-center bg-paper">
          <p className="text-sm text-ink-3">
            لا توجد مكوّنات مضافة لهذا الطلب بعد.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const nameError = errors?.components?.[index]?.name?.message;
            const costError = errors?.components?.[index]?.costCents?.message;
            const qtyError = errors?.components?.[index]?.quantity?.message;

            return (
              <div
                key={field.id}
                className="p-4 rounded-lg bg-paper border border-hairline shadow-sm relative flex flex-col gap-3 transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  {/* اسم المكون */}
                  <div className="flex-1">
                    <label
                      htmlFor={`comp-name-${field.id}`}
                      className="text-xs font-semibold text-ink-3 block mb-1"
                    >
                      اسم المكوّن
                    </label>
                    <input
                      id={`comp-name-${field.id}`}
                      type="text"
                      inputMode="text"
                      placeholder="اسم المكوّن"
                      {...register(`components.${index}.name`)}
                      className="w-full h-12 px-4 rounded-md border border-hairline-2 focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base leading-tight py-2.5 transition-colors"
                    />
                    {nameError && (
                      <span className="text-xs text-alert mt-1 block">{nameError}</span>
                    )}
                  </div>

                  {/* زر الحذف */}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="mt-5 p-2 rounded-md hover:bg-alert-soft text-alert transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center border border-hairline"
                    aria-label="حذف المكون"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* تكلفة المكون */}
                  <div>
                    <Controller
                      control={control}
                      name={`components.${index}.costCents`}
                      render={({ field: { value, onChange } }) => (
                        <MoneyInput
                          label="تكلفة المكوّن"
                          value={value}
                          onChange={onChange}
                          placeholder="0.000"
                          error={costError}
                        />
                      )}
                    />
                  </div>

                  {/* كمية المكون */}
                  <div>
                    <label
                      htmlFor={`comp-qty-${field.id}`}
                      className="text-xs font-semibold text-ink-3 block mb-1"
                    >
                      الكمية
                    </label>
                    <input
                      id={`comp-qty-${field.id}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="1"
                      {...register(`components.${index}.quantity`, { valueAsNumber: true })}
                      className="w-full h-12 px-4 rounded-md border border-hairline-2 focus:outline-none focus:ring-2 focus:ring-ink bg-paper text-base leading-tight py-2.5 transition-colors"
                    />
                    {qtyError && (
                      <span className="text-xs text-alert mt-1 block">{qtyError}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* زر إضافة مكوّن — يفتح منتقي الكتالوج */}
      <button
        type="button"
        onClick={() => setIsPickerOpen(true)}
        className="w-full min-h-[44px] py-3 rounded-md border border-dashed border-hairline-2 text-info hover:bg-info-soft transition-colors flex items-center justify-center gap-2 font-bold text-sm bg-paper"
      >
        <BookOpen className="w-4 h-4" />
        <span>إضافة مكوّن فرعي</span>
      </button>

      {/* منتقي الكتالوج */}
      <ResponsiveModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="اختر مكوّناً من الكتالوج"
      >
        <CatalogPicker
          onSelect={handleSelectFromCatalog}
          onManual={handleAddManual}
        />
      </ResponsiveModal>
    </div>
  );
}
