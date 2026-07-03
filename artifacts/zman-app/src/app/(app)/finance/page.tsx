import { Suspense } from "react";
import { SkeletonList } from "@/components/shared/SkeletonList";
import FinanceClient from "./FinanceClient";

export const metadata = {
  title: "المالية - Zman",
  description: "إدارة الحسابات المالية والمبيعات والمصاريف والمشتريات",
};

export default function FinancePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <SkeletonList count={4} />
        </div>
      }
    >
      <FinanceClient />
    </Suspense>
  );
}
