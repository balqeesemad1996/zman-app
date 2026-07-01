import { Suspense } from "react";
import FinanceClient from "./FinanceClient";

export const metadata = {
  title: "المالية - Zman",
  description: "إدارة الحسابات المالية والمبيعات والمصاريف والمشتريات",
};

export default function FinancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-ink/60">
          جاري تحميل الصفحة المالية...
        </div>
      }
    >
      <FinanceClient />
    </Suspense>
  );
}
