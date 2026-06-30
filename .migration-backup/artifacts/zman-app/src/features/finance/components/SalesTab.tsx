

import { Landmark, Plus, Search, ShoppingBag } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "@/lib/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { AmountText } from "@/components/shared/AmountText";
import { DateText } from "@/components/shared/DateText";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { SkeletonList } from "@/components/shared/SkeletonList";
import {
  useCreateSale,
  useDeleteSale,
  useInfiniteSales,
  useSale,
  useUpdateSale,
} from "../hooks";
import type { NewSale } from "../types";
import { SaleForm } from "./SaleForm";

export function SalesTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();

  const search = searchParams.get("search") || "";
  const source = searchParams.get("source") || "all";
  const newSale = searchParams.get("newSale") === "true";
  const editId = searchParams.get("editSale");

  // الفلاتر المتاحة للمصدر
  const sourceFilters = [
    { value: "all", label: "كل المبيعات" },
    { value: "manual", label: "مبيعات يدوية" },
    { value: "order", label: "مبيعات ناتجة عن طلبات" },
  ];

  // هوك جلب البيانات اللانهائي
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteSales({
    search,
    source: source === "all" ? undefined : (source as "manual" | "order"),
  });

  const { data: activeSale, isLoading: isLoadingActive } = useSale(
    editId || "",
  );
  const createMutation = useCreateSale();
  const updateMutation = useUpdateSale();
  const deleteMutation = useDeleteSale();

  const sales = data?.pages.flatMap((page) => page.items) || [];

  const updateUrl = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`);
    });
  };

  const handleSearchChange = (val: string) => {
    updateUrl({ search: val || null });
  };

  const handleSourceFilter = (val: string) => {
    updateUrl({ source: val === "all" ? null : val });
  };

  const handleCreate = async (values: NewSale) => {
    const requestId = crypto.randomUUID();
    const res = await createMutation.mutateAsync({ values, requestId });
    if (res.status === "ok") {
      toast.success("تم تسجيل عملية البيع بنجاح");
      updateUrl({ newSale: null });
      refetch();
    } else {
      toast.error(res.message);
    }
  };

  const handleUpdate = async (values: NewSale) => {
    if (!editId || !activeSale) return;
    const res = await updateMutation.mutateAsync({
      id: editId,
      updatedAt: activeSale.updatedAt,
      values,
    });
    if (res.status === "ok") {
      toast.success("تم تحديث المبيعات بنجاح");
      updateUrl({ editSale: null });
      refetch();
    } else {
      toast.error(res.message);
    }
  };

  const handleDelete = async () => {
    if (!editId || !activeSale) return;
    const confirm = window.confirm("هل أنت متأكد من حذف عملية البيع هذه؟");
    if (!confirm) return;

    const res = await deleteMutation.mutateAsync({
      id: editId,
      updatedAt: activeSale.updatedAt,
    });
    if (res.status === "ok") {
      toast.success("تم حذف المبيعات بنجاح");
      updateUrl({ editSale: null });
      refetch();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col">
      {/* شريط البحث وزر الإضافة */}
      <div className="sticky top-0 bg-canvas/95 backdrop-blur-sm pb-3 z-10 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute inset-s-4 top-3.5 h-5 w-5 text-ink-3" />
          <input
            type="text"
            placeholder="البحث في بيان المبيعات..."
            defaultValue={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-12 ps-11 pe-4 rounded-md border border-hairline-2 bg-paper text-base text-ink focus:outline-none focus:ring-2 focus:ring-ink transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={() => updateUrl({ newSale: "true" })}
          className="h-12 px-4 bg-info text-paper rounded-md flex items-center gap-1.5 text-sm font-bold hover:bg-info/90 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة</span>
        </button>
      </div>

      {/* مرشح مصدر المبيعات */}
      <div className="flex gap-2">
        {sourceFilters.map((filt) => {
          const isActive = source === filt.value;
          return (
            <button
              key={filt.value}
              type="button"
              onClick={() => handleSourceFilter(filt.value)}
              className={`flex-1 h-9 px-3 rounded-full text-xs font-bold border transition-all ${
                isActive
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-ink/75 border-hairline hover:border-ink/20"
              }`}
            >
              {filt.label}
            </button>
          );
        })}
      </div>

      {/* قائمة المبيعات */}
      {isLoading ? (
        <SkeletonList count={3} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : sales.length === 0 ? (
        <EmptyState
          title={
            search || source !== "all"
              ? "لا توجد نتائج بحث مطابقة"
              : "لا توجد عمليات بيع مسجلة"
          }
          description={
            search || source !== "all"
              ? "جرب تعديل كلمة البحث أو فلتر المصدر."
              : "تسجيل المبيعات المباشرة أو تحويل الطلبات المنتهية إلى مبيعات يثبت إيراداتك."
          }
          actionLabel={search || source !== "all" ? undefined : "تسجيل مبيعات"}
          onAction={
            search || source !== "all"
              ? undefined
              : () => updateUrl({ newSale: "true" })
          }
        />
      ) : (
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="space-y-3">
            {sales.map((item) => (
              // biome-ignore lint/a11y/useSemanticElements: card container is interactive
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => updateUrl({ editSale: item.id })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    updateUrl({ editSale: item.id });
                  }
                }}
                className="p-4 bg-paper rounded-lg border border-hairline flex flex-col gap-2 hover:border-ink/20 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink text-base">
                    {item.description || "عملية بيع"}
                  </span>
                  <span className="font-bold text-ink text-md">
                    <AmountText amount={item.amountCents} />
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-ink/60">
                  <span className="flex items-center gap-1">
                    {item.source === "order" ? (
                      <>
                        <ShoppingBag className="h-3.5 w-3.5 text-info" />
                        <span className="text-info font-bold">عن طريق طلب</span>
                      </>
                    ) : (
                      <>
                        <Landmark className="h-3.5 w-3.5 text-ink/60" />
                        <span>يدوي مباشر</span>
                      </>
                    )}
                  </span>
                  <DateText date={item.date} />
                </div>
              </div>
            ))}
          </div>

          {/* زر تحميل المزيد */}
          {hasNextPage && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full h-11 border border-hairline text-sm font-bold text-ink/80 rounded-md hover:bg-canvas transition-colors"
            >
              {isFetchingNextPage ? "جاري التحميل..." : "تحميل المزيد"}
            </button>
          )}
        </div>
      )}

      {/* ورقة إدخال مبيعات جديدة */}
      <ResponsiveModal
        isOpen={newSale}
        onClose={() => updateUrl({ newSale: null })}
        title="تسجيل إيراد مبيعات مباشر"
      >
        <SaleForm
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
        />
      </ResponsiveModal>

      {/* ورقة تعديل مبيعات قائمة */}
      <ResponsiveModal
        isOpen={!!editId}
        onClose={() => updateUrl({ editSale: null })}
        title="تعديل تفاصيل المبيعات"
      >
        {isLoadingActive ? (
          <SkeletonList count={3} />
        ) : (
          <SaleForm
            initialData={activeSale}
            onSubmit={handleUpdate}
            onDelete={handleDelete}
            isSubmitting={updateMutation.isPending || deleteMutation.isPending}
          />
        )}
      </ResponsiveModal>
    </div>
  );
}
