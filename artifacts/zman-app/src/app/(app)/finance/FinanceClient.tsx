"use client";

import { ArrowDownRight, ArrowUpRight, ShoppingCart } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { AppShellHeader } from "@/providers/app-shell-context";
import { SkeletonList } from "@/components/shared/SkeletonList";
import { SegmentedControl } from "@/components/shared/SegmentedControl";

// استيراد تبويبات المالية ديناميكياً لتقسيم الحزم البرمجية (§12.1)
const PurchasesTab = dynamic(
  () =>
    import("@/features/finance/components/PurchasesTab").then(
      (m) => m.PurchasesTab,
    ),
  {
    ssr: false,
    loading: () => <SkeletonList count={3} />,
  },
);

const ExpensesTab = dynamic(
  () =>
    import("@/features/finance/components/ExpensesTab").then(
      (m) => m.ExpensesTab,
    ),
  {
    ssr: false,
    loading: () => <SkeletonList count={3} />,
  },
);

const SalesTab = dynamic(
  () =>
    import("@/features/finance/components/SalesTab").then((m) => m.SalesTab),
  {
    ssr: false,
    loading: () => <SkeletonList count={3} />,
  },
);

export default function FinanceClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();

  // الحصول على التبويب النشط من محددات الـ URL (§7.3)
  const activeTab = searchParams.get("tab") || "purchases";

  const tabs = [
    { id: "purchases", label: "المشتريات", icon: ShoppingCart },
    { id: "expenses", label: "المصاريف", icon: ArrowDownRight },
    { id: "sales", label: "المبيعات", icon: ArrowUpRight },
  ];

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    // إزالة فلاتر البحث وصفحات التعديل للتبويب الآخر عند التنقل
    params.delete("search");
    params.delete("category");
    params.delete("source");
    params.delete("newPurchase");
    params.delete("editPurchase");
    params.delete("newExpense");
    params.delete("editExpense");
    params.delete("newSale");
    params.delete("editSale");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <>
      <AppShellHeader title="الحسابات المالية" />
      <div className="flex-1 flex flex-col gap-6">
        {/* أزرار التنقل بين التبويبات الثلاثة */}
        <SegmentedControl
          value={activeTab}
          onChange={handleTabChange}
          options={tabs.map((t) => ({
            value: t.id,
            label: t.label,
            icon: <t.icon className="h-4.5 w-4.5 shrink-0" />,
          }))}
          className="w-full"
        />

        {/* محتوى التبويب النشط */}
        <div className="flex-1 flex flex-col">
          {activeTab === "purchases" && <PurchasesTab />}
          {activeTab === "expenses" && <ExpensesTab />}
          {activeTab === "sales" && <SalesTab />}
        </div>
      </div>
    </>
  );
}
