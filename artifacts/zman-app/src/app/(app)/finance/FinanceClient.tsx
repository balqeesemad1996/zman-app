"use client";

import { Banknote, ShoppingCart, Wallet, Plus, Boxes, Landmark, User, Settings, ArrowLeftRight, Loader2, Search, X, Filter, MoreHorizontal, Check } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect, useCallback, useRef } from "react";
import { AppShellHeader } from "@/providers/app-shell-context";
import { SkeletonList } from "@/components/shared/SkeletonList";
import { Button } from "@/components/shared/Button";
import { FinanceCatalogModal } from "@/features/finance/components/FinanceCatalogModal";
import { useOpeningBalance } from "@/features/finance/hooks";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/components/shared/useClickOutside";

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

const AccountsTab = dynamic(
  () =>
    import("@/features/finance/components/AccountsTab").then((m) => m.AccountsTab),
  {
    ssr: false,
    loading: () => <SkeletonList count={3} />,
  },
);

const OwnerTab = dynamic(
  () =>
    import("@/features/finance/components/OwnerTab").then((m) => m.OwnerTab),
  {
    ssr: false,
    loading: () => <SkeletonList count={3} />,
  },
);

const OpeningTab = dynamic(
  () =>
    import("@/features/finance/components/OpeningTab").then((m) => m.OpeningTab),
  {
    ssr: false,
    loading: () => <SkeletonList count={3} />,
  },
);

const EXPENSE_CATEGORIES = [
  "الكل",
  "رواتب",
  "إيجار",
  "كهرباء ومياه",
  "نقل وتوصيل",
  "تعبئة وتغليف",
  "صيانة وأدوات",
  "أخرى",
];

const SALE_SOURCES = [
  { value: "all", label: "الكل" },
  { value: "manual", label: "يدوي" },
  { value: "order", label: "طلب محوّل" },
];

/* ─── أنواع التبويبات ─── */
const TABS = [
  { id: "purchases", label: "المشتريات", icon: ShoppingCart },
  { id: "expenses", label: "المصاريف", icon: Wallet },
  { id: "sales", label: "المبيعات", icon: Banknote },
  { id: "accounts", label: "الحسابات", icon: Landmark },
  { id: "owner", label: "المصاريف الشخصية", icon: User },
  { id: "opening", label: "الافتتاحي", icon: Settings },
] as const;

/* ─── زر أيقونة مُضمّن (بديل HeaderIconButton لتجنب التبعية) ─── */
function ToolbarBtn({
  label,
  isActive = false,
  badge = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  isActive?: boolean;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "relative w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center shrink-0 transition-all duration-[120ms] ease-out active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info",
        isActive
          ? "border-info bg-info-soft text-info"
          : "border-hairline bg-paper text-ink-2 hover:text-ink hover:bg-canvas",
        className,
      )}
      {...props}
    >
      {children}
      {badge && !isActive && (
        <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-info ring-2 ring-paper" />
      )}
    </button>
  );
}

export default function FinanceClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();

  // التبويب الافتراضي هو المشتريات دائماً
  const { isLoading: opBalLoading } = useOpeningBalance();
  const activeTab = searchParams.get("tab") || "purchases";
  const isReady = !opBalLoading || searchParams.has("tab");

  // حالة البحث
  const currentQuery = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(currentQuery);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // حالات القوائم المنسدلة
  const [filterOpen, setFilterOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // حالة مودال الكتالوج
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogType, setCatalogType] = useState<"purchases" | "expenses">("purchases");

  // مزامنة البحث مع URL
  useEffect(() => { setSearchInput(currentQuery); }, [currentQuery]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput === currentQuery) return;
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) params.set("search", searchInput);
      else params.delete("search");
      router.replace(`${pathname}?${params.toString()}`);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, currentQuery, pathname, router, searchParams]);

  // إغلاق القوائم عند النقر خارجها
  useClickOutside(searchRef, () => { if (!searchInput) setSearchOpen(false); }, searchOpen);
  useClickOutside(filterRef, () => setFilterOpen(false), filterOpen);
  useClickOutside(moreRef, () => setMoreOpen(false), moreOpen);

  /* ─── تبديل التبويبات ─── */
  const handleTabChange = useCallback((tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    params.delete("search");
    params.delete("category");
    params.delete("source");
    params.delete("newPurchase");
    params.delete("editPurchase");
    params.delete("newExpense");
    params.delete("editExpense");
    params.delete("newSale");
    params.delete("editSale");
    setSearchOpen(false);
    setFilterOpen(false);
    setMoreOpen(false);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [searchParams, pathname, router, startTransition]);

  /* ─── حساب المتغيرات المشتقة للكتالوج ─── */
  const manageCatalogParam = searchParams.get("manageCatalog");
  const showCatalog = isCatalogOpen || !!manageCatalogParam;
  const resolvedCatalogType = (manageCatalogParam as "purchases" | "expenses") || catalogType;

  const handleCloseCatalog = () => {
    setIsCatalogOpen(false);
    if (searchParams.has("manageCatalog")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("manageCatalog");
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  const isActionableTab = activeTab !== "opening";
  const hasSearch = activeTab === "purchases" || activeTab === "expenses" || activeTab === "sales";

  // فلاتر ديناميكية حسب التبويب
  const filters = activeTab === "expenses" ? [{
    key: "category",
    label: "الفئة",
    value: searchParams.get("category") || "all",
    options: EXPENSE_CATEGORIES.map((cat) => ({
      value: cat === "الكل" ? "all" : cat,
      label: cat,
    })),
    onChange: (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("category");
      else params.set("category", val);
      router.replace(`${pathname}?${params.toString()}`);
    },
  }] : activeTab === "sales" ? [{
    key: "source",
    label: "المصدر",
    value: searchParams.get("source") || "all",
    options: SALE_SOURCES,
    onChange: (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("source");
      else params.set("source", val);
      router.replace(`${pathname}?${params.toString()}`);
    },
  }] : null;

  const hasActiveFilter = filters?.some((g) => g.value !== g.options[0]?.value) ?? false;

  /* ─── الإجراء الأساسي (+) ─── */
  const handleAdd = useCallback(() => {
    const paramMap: Record<string, string> = {
      purchases: "newPurchase", expenses: "newExpense", sales: "newSale",
      accounts: "newAccount", owner: "newOwnerTx",
    };
    const queryParam = paramMap[activeTab];
    if (!queryParam) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(queryParam, "true");
    router.replace(`${pathname}?${params.toString()}`);
  }, [activeTab, searchParams, pathname, router]);

  const addLabel: Record<string, string> = {
    purchases: "مشتريات جديدة", expenses: "مصروف جديد", sales: "مبيعات جديدة",
    accounts: "حساب جديد", owner: "معاملة مالك جديدة",
  };

  /* ─── بناء شريط الأدوات المُخصّص ─── */
  const buildToolbar = () => {
    // ── حالة البحث المتوسّع: يأخذ كامل العرض ──
    if (searchOpen && hasSearch) {
      return (
        <div ref={searchRef} className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-ink/40 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (searchInput) setSearchInput("");
                  else setSearchOpen(false);
                }
              }}
              placeholder={
                activeTab === "purchases" ? "البحث في المشتريات..."
                : activeTab === "expenses" ? "البحث في المصاريف..."
                : "البحث في بيان المبيعات..."
              }
              className="w-full h-11 min-h-[44px] ps-10 pe-4 rounded-lg border border-hairline-2 bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info"
            />
          </div>
          <ToolbarBtn
            label="إغلاق البحث"
            onClick={() => { setSearchInput(""); setSearchOpen(false); }}
          >
            <X className="w-5 h-5" />
          </ToolbarBtn>
          {/* حجز مكان زر الإضافة حتى في وضع البحث */}
          <div className="w-11 h-11 shrink-0 flex items-center justify-center">
            {isActionableTab ? (
              <Button onClick={handleAdd} size="icon" aria-label={addLabel[activeTab] ?? ""} title={addLabel[activeTab] ?? ""}>
                <Plus className="w-5 h-5" />
              </Button>
            ) : null}
          </div>
        </div>
      );
    }

    // ── الحالة العادية: 3 أعمدة ثابتة ──
    return (
      <div className="flex items-center w-full gap-1">
        {/* ─ العمود الأيمن (start في RTL): زر الإضافة ─ */}
        <div className="w-11 lg:w-auto h-11 shrink-0 flex items-center justify-center">
          {isActionableTab ? (
            <Button
              onClick={handleAdd}
              size="icon"
              className="lg:w-auto lg:min-w-0 lg:px-4 lg:py-2 lg:gap-2 flex items-center justify-center"
              aria-label={addLabel[activeTab] ?? ""}
              title={addLabel[activeTab] ?? ""}
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span className="hidden lg:inline text-sm font-bold whitespace-nowrap">
                {addLabel[activeTab]}
              </span>
            </Button>
          ) : null}
        </div>

        {/* ─ العمود الوسط: شريط التبويبات ─ */}
        <div className="flex-1 flex items-center justify-center min-w-0 overflow-x-auto no-scrollbar">
          <div className="grid grid-cols-5 lg:flex items-center rounded-lg border border-hairline bg-canvas p-1 gap-0.5 w-full lg:w-auto shrink-0">
            {[
              TABS.find((t) => t.id === "purchases")!,
              TABS.find((t) => t.id === "expenses")!,
              TABS.find((t) => t.id === "owner")!,
              TABS.find((t) => t.id === "sales")!,
            ].map((tab) => {
              const isActive = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  title={tab.label}
                  aria-label={tab.label}
                  className={cn(
                    "flex items-center justify-center min-h-[36px] h-9 w-full lg:w-auto lg:px-3 lg:gap-1.5 rounded-md transition-all duration-[120ms] ease-out active:scale-[0.94]",
                    isActive
                      ? "bg-info text-paper shadow-sm"
                      : "text-ink-3 hover:text-ink hover:bg-paper/60"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="hidden lg:inline text-xs font-bold whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}

            {/* زر المزيد */}
            <div ref={moreRef} className="relative w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                title="المزيد"
                aria-label="المزيد"
                className={cn(
                  "flex items-center justify-center min-h-[36px] h-9 w-full lg:w-auto lg:px-3 gap-1.5 rounded-md transition-all duration-[120ms] ease-out active:scale-[0.94]",
                  activeTab === "accounts" || activeTab === "opening"
                    ? "bg-info text-paper shadow-sm"
                    : "text-ink-3 hover:text-ink hover:bg-paper/60"
                )}
              >
                <MoreHorizontal className="h-5 w-5 shrink-0" />
                <span className="text-xs font-bold whitespace-nowrap">المزيد</span>
              </button>
              {moreOpen && (
                <div className="absolute end-0 top-full mt-2 z-dropdown w-56 max-w-[calc(100vw-1rem)] bg-paper rounded-lg border border-hairline-2 shadow-lg p-1.5 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      handleTabChange("accounts");
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 min-h-[44px] px-3 rounded-md text-sm transition-colors text-start",
                      activeTab === "accounts"
                        ? "bg-info-soft text-info font-bold"
                        : "text-ink-2 hover:bg-canvas hover:text-ink"
                    )}
                  >
                    <Landmark className="w-5 h-5 shrink-0 text-info" />
                    <span>الحسابات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleTabChange("opening");
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 min-h-[44px] px-3 rounded-md text-sm transition-colors text-start",
                      activeTab === "opening"
                        ? "bg-info-soft text-info font-bold"
                        : "text-ink-2 hover:bg-canvas hover:text-ink"
                    )}
                  >
                    <Settings className="w-5 h-5 shrink-0 text-info" />
                    <span>الافتتاحي</span>
                  </button>

                  <div className="my-1 border-t border-hairline" />

                  {activeTab === "accounts" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          params.set("newTransfer", "true");
                          router.replace(`${pathname}?${params.toString()}`);
                          setMoreOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 min-h-[44px] px-3 rounded-md text-sm text-ink-2 hover:bg-canvas hover:text-ink transition-colors text-start"
                      >
                        <ArrowLeftRight className="w-5 h-5 shrink-0 text-info" />
                        <span>تحويل بيني</span>
                      </button>
                      <div className="my-1 border-t border-hairline" />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCatalogType("purchases");
                      setIsCatalogOpen(true);
                      setMoreOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 min-h-[44px] px-3 rounded-md text-sm text-ink-2 hover:bg-canvas hover:text-ink transition-colors text-start"
                  >
                    <Boxes className="w-5 h-5 shrink-0 text-info" />
                    <span>إدارة أصناف المشتريات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCatalogType("expenses");
                      setIsCatalogOpen(true);
                      setMoreOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 min-h-[44px] px-3 rounded-md text-sm text-ink-2 hover:bg-canvas hover:text-ink transition-colors text-start"
                  >
                    <Boxes className="w-5 h-5 shrink-0 text-info" />
                    <span>إدارة فئات المصاريف</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─ العمود الأيسر (end في RTL): بحث + فلتر ─ */}
        <div className="flex items-center gap-1 shrink-0">
          {/* زر البحث */}
          {hasSearch ? (
            <ToolbarBtn
              label="بحث"
              isActive={!!searchInput}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-5 h-5" />
            </ToolbarBtn>
          ) : (
            <span className="hidden sm:inline-block w-11 h-11 shrink-0" aria-hidden="true" />
          )}

          {/* زر الفلتر */}
          {filters && filters.length > 0 ? (
            <div ref={filterRef} className="relative">
              <ToolbarBtn
                label="تصفية"
                isActive={filterOpen}
                badge={hasActiveFilter}
                onClick={() => setFilterOpen((o) => !o)}
              >
                <Filter className="w-5 h-5" />
              </ToolbarBtn>
              {filterOpen && (
                <div className="absolute end-0 top-full mt-2 z-dropdown w-60 max-w-[calc(100vw-1rem)] max-h-[70vh] overflow-y-auto bg-paper rounded-lg border border-hairline-2 shadow-lg p-3 space-y-4 animate-fade-in">
                  {filters.map((group) => (
                    <div key={group.key} className="space-y-1.5">
                      <p className="text-[11px] font-bold text-ink/50 px-1">{group.label}</p>
                      <div className="flex flex-col gap-0.5">
                        {group.options.map((opt) => {
                          const active = group.value === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { group.onChange(opt.value); setFilterOpen(false); }}
                              className={cn(
                                "flex items-center justify-between gap-2 min-h-[40px] px-2.5 rounded-md text-sm text-start transition-colors",
                                active ? "bg-info-soft text-info font-bold" : "text-ink-2 hover:bg-canvas",
                              )}
                            >
                              <span>{opt.label}</span>
                              {active && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="hidden sm:inline-block w-11 h-11 shrink-0" aria-hidden="true" />
          )}

          {/* مساحة محجوزة للترس الملغى */}
          <span className="hidden sm:inline-block w-11 h-11 shrink-0" aria-hidden="true" />
        </div>
      </div>
    );
  };

  /* ─── التقديم ─── */
  return (
    <>
      <AppShellHeader title="" action={buildToolbar()} />
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex-1 flex flex-col">
          {!isReady ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-info" />
            </div>
          ) : (
            <>
              {activeTab === "purchases" && <PurchasesTab />}
              {activeTab === "expenses" && <ExpensesTab />}
              {activeTab === "sales" && <SalesTab />}
              {activeTab === "accounts" && <AccountsTab />}
              {activeTab === "owner" && <OwnerTab />}
              {activeTab === "opening" && <OpeningTab />}
            </>
          )}
        </div>
      </div>

      {showCatalog && (
        <FinanceCatalogModal
          isOpen={showCatalog}
          onClose={handleCloseCatalog}
          type={resolvedCatalogType}
        />
      )}
    </>
  );
}
