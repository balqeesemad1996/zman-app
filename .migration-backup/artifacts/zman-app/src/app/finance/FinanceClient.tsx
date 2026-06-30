import { ArrowDownRight, ArrowUpRight, ShoppingCart } from "lucide-react";
import { Suspense, lazy, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "@/lib/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SkeletonList } from "@/components/shared/SkeletonList";

const PurchasesTab = lazy(() =>
  import("@/features/finance/components/PurchasesTab").then((m) => ({ default: m.PurchasesTab })),
);
const ExpensesTab = lazy(() =>
  import("@/features/finance/components/ExpensesTab").then((m) => ({ default: m.ExpensesTab })),
);
const SalesTab = lazy(() =>
  import("@/features/finance/components/SalesTab").then((m) => ({ default: m.SalesTab })),
);

export default function FinanceClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();

  const activeTab = searchParams.get("tab") || "purchases";

  const tabs = [
    { id: "purchases", label: "المشتريات", icon: ShoppingCart },
    { id: "expenses", label: "المصاريف", icon: ArrowDownRight },
    { id: "sales", label: "المبيعات", icon: ArrowUpRight },
  ];

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    params.delete("search"); params.delete("category"); params.delete("source");
    params.delete("newPurchase"); params.delete("editPurchase");
    params.delete("newExpense"); params.delete("editExpense");
    params.delete("newSale"); params.delete("editSale");
    startTransition(() => { router.push(`${pathname}?${params.toString()}`); });
  };

  return (
    <AppShell title="الحسابات المالية">
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex bg-canvas p-1.5 rounded-lg border border-hairline">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" onClick={() => handleTabChange(t.id)}
                className={`flex-1 h-11 min-h-[44px] px-3 rounded-md flex items-center justify-center gap-1.5 text-sm font-bold transition-all ${isActive ? "bg-paper text-ink shadow-sm" : "text-ink/60 hover:text-ink/80"}`}>
                <Icon className={`h-4 w-4 ${isActive ? "text-info" : ""}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 flex flex-col">
          <Suspense fallback={<SkeletonList count={3} />}>
            {activeTab === "purchases" && <PurchasesTab />}
            {activeTab === "expenses" && <ExpensesTab />}
            {activeTab === "sales" && <SalesTab />}
          </Suspense>
        </div>
      </div>
    </AppShell>
  );
}
