import { Suspense } from "react";
import { SkeletonList } from "@/components/shared/SkeletonList";
import dynamic from "next/dynamic";

export const metadata = {
  title: "إدارة الطلبات | Zman",
};

// تحميل OrdersClient ديناميكياً لإبقاء الصفحة ضمن حد حزمة التحميل الأول (150KB)
const OrdersClient = dynamic(() => import("./OrdersClient"), {
  loading: () => <SkeletonList />,
});

export default function Page() {
  return (
    <Suspense fallback={<SkeletonList />}>
      <OrdersClient />
    </Suspense>
  );
}
