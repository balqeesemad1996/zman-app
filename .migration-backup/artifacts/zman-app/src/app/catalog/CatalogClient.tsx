import { useState } from "react";
import { Plus, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { AmountText } from "@/components/shared/AmountText";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { SkeletonList } from "@/components/shared/SkeletonList";
import {
  useInfiniteCatalog,
  useCreateCatalogComponent,
  useUpdateCatalogComponent,
  useDeleteCatalogComponent,
} from "@/features/catalog/hooks";
import { CatalogForm } from "@/features/catalog/components/CatalogForm";
import type { CatalogComponent, NewCatalogComponent } from "@/features/catalog/types";

export default function CatalogClient() {
  const [search, setSearch] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [editing, setEditing] = useState<CatalogComponent | null>(null);

  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    useInfiniteCatalog({ search });

  const createMutation = useCreateCatalogComponent();
  const updateMutation = useUpdateCatalogComponent();
  const deleteMutation = useDeleteCatalogComponent();

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  const handleCreate = async (values: NewCatalogComponent) => {
    const res = await createMutation.mutateAsync(values);
    if (res.status === "ok") {
      toast.success("تم إضافة المكوّن للكتالوج");
      setIsNew(false);
    } else {
      toast.error(res.message);
    }
  };

  const handleUpdate = async (values: NewCatalogComponent) => {
    if (!editing) return;
    const res = await updateMutation.mutateAsync({ id: editing.id, ...values });
    if (res.status === "ok") {
      toast.success("تم تحديث المكوّن");
      setEditing(null);
    } else {
      toast.error(res.message);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا المكوّن من الكتالوج؟")) return;
    const res = await deleteMutation.mutateAsync(editing.id);
    if (res.status === "ok") {
      toast.success("تم حذف المكوّن");
      setEditing(null);
    } else {
      toast.error(res.message);
    }
  };

  const pageAction = (
    <button
      type="button"
      onClick={() => setIsNew(true)}
      className="min-h-[44px] px-4 py-2 rounded-md bg-info hover:bg-info/90 text-paper font-bold text-sm flex items-center gap-2 transition-colors"
    >
      <Plus className="w-4 h-4" />
      <span className="hidden sm:inline">مكوّن جديد</span>
    </button>
  );

  return (
    <AppShell title="كتالوج المكوّنات" action={pageAction}>
      <div className="space-y-4 flex-1 flex flex-col">
        {/* بحث */}
        <div className="relative">
          <Search className="absolute inset-s-3 top-3 h-4.5 w-4.5 text-ink/40" />
          <input
            type="text"
            placeholder="ابحث في أسماء المكوّنات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 ps-10 pe-4 rounded-md border border-hairline bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
          />
        </div>

        {/* القائمة */}
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title={search ? "لا توجد نتائج مطابقة" : "الكتالوج فارغ حتى الآن"}
            description={
              search
                ? "جرب كلمة بحث مختلفة"
                : "أضف المكوّنات الشائعة في طلباتك (وعاء، صبّار، طباعة...) وستظهر تلقائياً عند إنشاء أي طلب جديد"
            }
            actionLabel={search ? undefined : "إضافة أول مكوّن"}
            onAction={search ? undefined : () => setIsNew(true)}
          />
        ) : (
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-paper rounded-lg border border-hairline hover:border-ink/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-base truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-ink/50">{item.unit}</span>
                      {item.notes && (
                        <span className="text-xs text-ink/40 truncate max-w-[180px]">{item.notes}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ms-3 flex-shrink-0">
                    <AmountText amount={item.defaultCostCents} className="font-bold text-info text-sm" />
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-canvas transition-colors text-ink/60 hover:text-ink"
                      aria-label="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
      </div>

      {/* نموذج إضافة */}
      <ResponsiveModal
        isOpen={isNew}
        onClose={() => setIsNew(false)}
        title="إضافة مكوّن للكتالوج"
      >
        <CatalogForm
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
        />
      </ResponsiveModal>

      {/* نموذج تعديل */}
      <ResponsiveModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="تعديل مكوّن الكتالوج"
      >
        {editing && (
          <CatalogForm
            initialData={editing}
            onSubmit={handleUpdate}
            onDelete={handleDelete}
            isSubmitting={updateMutation.isPending || deleteMutation.isPending}
          />
        )}
      </ResponsiveModal>
    </AppShell>
  );
}
