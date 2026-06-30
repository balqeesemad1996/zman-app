import { Plus, CalendarDays, List } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "@/lib/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonList } from "@/components/shared/SkeletonList";
import { useOrder } from "@/features/orders/hooks";
import type { Order } from "@/features/orders/types";

const OrderList = lazy(() =>
  import("@/features/orders/components/OrderList").then((m) => ({ default: m.OrderList })),
);
const OrderForm = lazy(() =>
  import("@/features/orders/components/OrderForm").then((m) => ({ default: m.OrderForm })),
);
const OrderDetail = lazy(() =>
  import("@/features/orders/components/OrderDetail").then((m) => ({ default: m.OrderDetail })),
);
const OrdersCalendar = lazy(() =>
  import("@/features/orders/components/OrdersCalendar").then((m) => ({ default: m.OrdersCalendar })),
);

export default function OrdersClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCalendarView, setIsCalendarView] = useState(false);

  const viewId = searchParams.get("view");
  const editId = searchParams.get("edit");
  const isNew = searchParams.get("new") === "true";

  const { data: editOrder, isLoading: isLoadingEdit, isError: isErrorEdit, refetch: refetchEdit } = useOrder(editId || "");

  const navigateTo = (paramsToSet: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view"); params.delete("edit"); params.delete("new");
    for (const [key, value] of Object.entries(paramsToSet)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleShowList = () => navigateTo({});
  const handleShowDetail = (order: Order) => navigateTo({ view: order.id });
  const handleShowEdit = (order: Order) => navigateTo({ edit: order.id });
  const handleShowCreate = () => navigateTo({ new: "true" });

  const isOverlay = isNew || !!editId || !!viewId;

  let pageTitle = "الطلبات الجارية";
  let pageAction: React.ReactNode = null;

  if (isNew) {
    pageTitle = "إنشاء طلب جديد";
  } else if (editId) {
    pageTitle = "تعديل بيانات الطلب";
  } else if (viewId) {
    pageTitle = "تفاصيل الطلب";
  } else {
    pageTitle = "الطلبات الجارية";
    pageAction = (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsCalendarView((v) => !v)}
          className="min-h-[44px] px-3 py-2 rounded-md border border-hairline text-ink-2 hover:bg-canvas flex items-center gap-1.5 transition-colors text-sm"
          title={isCalendarView ? "عرض القائمة" : "عرض التقويم"}
        >
          {isCalendarView ? (
            <List className="w-4 h-4" />
          ) : (
            <CalendarDays className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {isCalendarView ? "قائمة" : "تقويم"}
          </span>
        </button>
        <button
          type="button"
          onClick={handleShowCreate}
          className="min-h-[44px] px-4 py-2 rounded-md bg-info hover:bg-info/90 text-paper font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">طلب جديد</span>
        </button>
      </div>
    );
  }

  const renderEditForm = () => {
    if (isLoadingEdit) return <SkeletonList count={3} />;
    if (isErrorEdit || !editOrder) return <ErrorState message="فشل تحميل السجل المراد تعديله" onRetry={refetchEdit} />;
    return (
      <Suspense fallback={<SkeletonList count={3} />}>
        <OrderForm initialData={editOrder} onSubmitSuccess={handleShowList} onCancel={handleShowList} />
      </Suspense>
    );
  };

  return (
    <AppShell title={pageTitle} action={pageAction}>
      {isNew && (
        <Suspense fallback={<SkeletonList count={3} />}>
          <OrderForm onSubmitSuccess={handleShowList} onCancel={handleShowList} />
        </Suspense>
      )}
      {!!editId && renderEditForm()}
      {!!viewId && (
        <Suspense fallback={<SkeletonList count={2} />}>
          <OrderDetail
            orderId={viewId}
            onEdit={() => handleShowEdit({ id: viewId } as Order)}
            onBack={handleShowList}
          />
        </Suspense>
      )}
      {!isOverlay && (
        isCalendarView ? (
          <Suspense fallback={<SkeletonList count={3} />}>
            <OrdersCalendar
              onViewDetail={handleShowDetail}
              onCreateNew={handleShowCreate}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<SkeletonList count={3} />}>
            <OrderList
              onEdit={handleShowEdit}
              onDelete={(order) => navigateTo({ view: order.id })}
              onViewDetail={handleShowDetail}
              onCreateNew={handleShowCreate}
            />
          </Suspense>
        )
      )}
    </AppShell>
  );
}
