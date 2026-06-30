import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { AmountText } from "@/components/shared/AmountText";
import { SkeletonList } from "@/components/shared/SkeletonList";
import { useInfiniteCatalog } from "../hooks";
import type { CatalogComponent } from "../types";

interface CatalogPickerProps {
  onSelect: (component: CatalogComponent) => void;
  onManual: () => void;
}

export function CatalogPicker({ onSelect, onManual }: CatalogPickerProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useInfiniteCatalog({ search });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-3 pb-2">
      {/* بحث */}
      <div className="relative sticky top-0 bg-paper z-10 pb-2">
        <Search className="absolute inset-s-3 top-3 h-4.5 w-4.5 text-ink/40" />
        <input
          type="text"
          inputMode="text"
          placeholder="ابحث في المكوّنات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 ps-10 pe-4 rounded-md border border-hairline bg-canvas text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
          autoFocus
        />
      </div>

      {/* قائمة المكوّنات */}
      {isLoading ? (
        <SkeletonList count={4} />
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-ink/50 py-6">
          {search ? "لا توجد نتائج مطابقة" : "الكتالوج فارغ — أضف مكوّنات أولاً من صفحة الكتالوج"}
        </p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full flex items-center justify-between p-3.5 rounded-lg border border-hairline hover:border-info/40 hover:bg-info/5 transition-colors text-start"
            >
              <div>
                <p className="font-bold text-sm text-ink">{item.name}</p>
                <p className="text-xs text-ink/50 mt-0.5">{item.unit}</p>
              </div>
              <AmountText amount={item.defaultCostCents} className="text-sm font-bold text-info" />
            </button>
          ))}
        </div>
      )}

      {/* فاصل */}
      <div className="border-t border-hairline pt-3">
        <button
          type="button"
          onClick={onManual}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-md border border-dashed border-hairline text-ink/70 hover:text-ink hover:border-ink/30 transition-colors text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>مكوّن مخصص (يدوي)</span>
        </button>
      </div>
    </div>
  );
}
