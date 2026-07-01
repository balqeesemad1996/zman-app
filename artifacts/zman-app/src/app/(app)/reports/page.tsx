"use client";

import {
  Archive,
  ArrowDownRight,
  BarChart2,
  Download,
  Loader2,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShellHeader } from "@/providers/app-shell-context";
import { AmountText } from "@/components/shared/AmountText";
import {
  downloadReport,
  getAllReportData,
  type StructuredReportData,
} from "@/features/reports/actions";

const statusColors: Record<string, string> = {
  draft: "bg-warn-soft text-warn-deep",
  sent: "bg-info-soft text-info",
  confirmed: "bg-info-soft text-info",
  delivered: "bg-info-soft text-info",
  cancelled: "bg-alert-soft text-alert",
};

const DONUT_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6b7280"];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-ink border-b border-hairline pb-3 mb-4">
      {children}
    </h3>
  );
}

function StatCard({
  label,
  amount,
  sub,
  icon: Icon,
  colorClass,
  sign,
}: {
  label: string;
  amount: number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  sign?: string;
}) {
  return (
    <div className="p-4 bg-paper rounded-lg border border-hairline shadow-sm flex flex-col gap-2">
      <span className={`text-xs font-bold flex items-center gap-1.5 ${colorClass}`}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        {label}
      </span>
      <span className={`text-xl font-bold flex items-baseline gap-1 ${colorClass}`}>
        {sign && <span className="font-mono text-base">{sign}</span>}
        <AmountText amount={amount} />
      </span>
      <span className="text-[10px] text-ink/40 leading-snug">{sub}</span>
    </div>
  );
}

function ProgressBar({ pct, colorClass, style }: { pct: number; colorClass?: string; style?: React.CSSProperties }) {
  return (
    <div className="w-full bg-canvas rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full ${colorClass || ""}`}
        style={{ width: `${Math.min(100, pct)}%`, ...style }}
      />
    </div>
  );
}

export default function ReportsPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<"all" | "month" | "30d">("all");

  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: ["reports", dateRange],
    queryFn: async () => {
      const res = await getAllReportData(dateRange);
      if (res.status === "error") {
        toast.error(res.message);
        throw new Error(res.message);
      }
      return res.data || null;
    },
  });

  const data = queryData || null;

  const handleDownload = async (
    type: "pnl" | "expenses" | "sales" | "orders" | "products",
    title: string,
  ) => {
    setDownloadingId(type);
    try {
      const res = await downloadReport(type, dateRange);
      if (res.status === "ok" && res.data) {
        const BOM = "\uFEFF";
        const blob = new Blob([BOM + res.data], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const dateStr = new Date().toISOString().split("T")[0] ?? "";
        const safeName = type;
        link.download = `report_${safeName}_${dateStr}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`تم تحميل ${title} بنجاح`);
      } else {
        toast.error(res.status === "error" ? res.message : "فشل تحميل التقرير");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloadingId(null);
    }
  };

  const net = data?.pnl.netCents ?? 0;
  const isProfit = net >= 0;

  return (
    <>
      <AppShellHeader
        title="التقارير المالية والتشغيلية"
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="h-10 min-h-[44px] px-3 bg-canvas border border-hairline text-ink rounded-md flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        }
      />
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink/40">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">جارٍ تحميل التقارير…</span>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-sm text-ink/60">تعذّر تحميل البيانات</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-4 h-10 bg-ink text-paper rounded-md text-sm font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-hairline">
            <div>
              <h2 className="text-xl font-bold text-ink">التقارير المالية والتشغيلية</h2>
              <p className="text-xs text-ink/50 mt-1">
                آخر تحديث: {new Date().toLocaleDateString("ar-JO", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>

            {/* فلتر فترة التقارير */}
            <div className="flex gap-2 bg-canvas p-1 rounded-lg border border-hairline w-fit">
              {[
                { v: "all", l: "كل الفترات" },
                { v: "month", l: "هذا الشهر" },
                { v: "30d", l: "آخر 30 يوم" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setDateRange(opt.v as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all min-h-[38px] ${
                    dateRange === opt.v
                      ? "bg-paper text-ink shadow-sm border border-hairline-2"
                      : "text-ink/60 hover:text-ink"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* ===== ١ — ملخص الأرباح والخسائر ===== */}
          <section className="bg-paper rounded-lg border border-hairline shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>
                <span className="flex items-center gap-2">
                  {isProfit ? (
                    <TrendingUp className="h-4 w-4 text-info" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-alert" />
                  )}
                  ملخص الأرباح والخسائر (P&L)
                </span>
              </SectionTitle>
              <button
                type="button"
                onClick={() => void handleDownload("pnl", "الأرباح والخسائر")}
                disabled={downloadingId !== null}
                className="flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink border border-hairline rounded-md px-3 min-h-[44px] h-11 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {downloadingId === "pnl" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">تحميل</span>
              </button>
            </div>

            {/* بطاقة صافي الربح */}
            <div className={`p-5 rounded-lg border ${isProfit ? "border-info/30 bg-info-soft" : "border-alert/30 bg-alert-soft"}`}>
              <p className="text-xs font-bold text-ink/60 mb-1.5">صافي الأرباح / الخسائر الإجمالية</p>
              <p className={`text-3xl font-bold flex items-baseline gap-1 ${isProfit ? "text-info" : "text-alert"}`}>
                <span className="font-mono text-2xl">{isProfit ? "+" : "−"}</span>
                <AmountText amount={Math.abs(net)} />
              </p>
              <p className="text-[11px] text-ink/50 mt-1.5 flex justify-between items-center flex-wrap gap-1">
                <span>المبيعات ناقصاً المشتريات والمصاريف التشغيلية</span>
                {data.pnl.salesCents > 0 && (
                  <span className="font-bold">
                    هامش الربح: {((net / data.pnl.salesCents) * 100).toFixed(1)}%
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label="إجمالي المبيعات"
                amount={data.pnl.salesCents}
                sub="مجموع الإيرادات الواردة"
                icon={ShoppingBag}
                colorClass="text-info"
                sign="+"
              />
              <StatCard
                label="إجمالي المشتريات"
                amount={data.pnl.purchasesCents}
                sub="تكاليف المواد الخام"
                icon={ShoppingCart}
                colorClass="text-alert"
                sign="−"
              />
              <StatCard
                label="إجمالي المصاريف"
                amount={data.pnl.expensesCents}
                sub="المصاريف التشغيلية والرواتب"
                icon={ArrowDownRight}
                colorClass="text-alert"
                sign="−"
              />
            </div>
          </section>

          {/* ===== ٢ — فئات المصاريف ===== */}
          <section className="bg-paper rounded-lg border border-hairline shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-alert" />
                  توزيع المصاريف حسب الفئة
                </span>
              </SectionTitle>
              <button
                type="button"
                onClick={() => void handleDownload("expenses", "فئات المصاريف")}
                disabled={downloadingId !== null}
                className="flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink border border-hairline rounded-md px-3 min-h-[44px] h-11 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {downloadingId === "expenses" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">تحميل</span>
              </button>
            </div>

            {data.expensesByCategory.length === 0 ? (
              <p className="text-sm text-ink/45 text-center py-6">لا توجد مصاريف مسجّلة بعد</p>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Donut SVG */}
                <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                    {(() => {
                      let cumulativePct = 0;
                      return data.expensesByCategory.map((cat, i) => {
                        const dash = (cat.pct / 100) * 251.2;
                        const offset = (cumulativePct / 100) * 251.2;
                        cumulativePct += cat.pct;
                        return (
                          <circle
                            key={cat.category}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                            strokeWidth="12"
                            strokeDasharray={`${dash} 251.2`}
                            strokeDashoffset={-offset}
                            className="transition-all duration-300"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-ink/50 font-bold">المصاريف</span>
                    <span className="text-xs font-bold text-ink truncate max-w-[100px] text-center">
                      <AmountText amount={data.pnl.expensesCents} />
                    </span>
                  </div>
                </div>

                {/* Legend & Progress Bars */}
                <div className="flex-1 w-full space-y-3">
                  {data.expensesByCategory.map((cat, i) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-ink/85 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                          {cat.category}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-ink/45">{cat.count} حركة</span>
                          <span className="font-bold text-alert">
                            <AmountText amount={cat.totalCents} />
                          </span>
                          <span className="text-xs text-ink/40 w-10 text-end">
                            {cat.pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <ProgressBar pct={cat.pct} style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ===== ٣ — مصادر المبيعات ===== */}
          <section className="bg-paper rounded-lg border border-hairline shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-info" />
                  مصادر المبيعات والإيرادات
                </span>
              </SectionTitle>
              <button
                type="button"
                onClick={() => void handleDownload("sales", "مصادر المبيعات")}
                disabled={downloadingId !== null}
                className="flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink border border-hairline rounded-md px-3 min-h-[44px] h-11 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {downloadingId === "sales" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">تحميل</span>
              </button>
            </div>

            {data.salesBySource.length === 0 ? (
              <p className="text-sm text-ink/45 text-center py-6">لا توجد مبيعات مسجّلة بعد</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.salesBySource.map((src) => (
                  <div key={src.source} className="p-4 border border-hairline rounded-lg bg-canvas space-y-2">
                    <p className="text-xs font-bold text-ink/65">{src.label}</p>
                    <p className="text-xl font-bold text-info">
                      <AmountText amount={src.totalCents} />
                    </p>
                    <div className="flex items-center justify-between text-xs text-ink/45">
                      <span>{src.count} عملية</span>
                      <span>{src.pct.toFixed(1)}% من المبيعات</span>
                    </div>
                    <ProgressBar pct={src.pct} colorClass="bg-info" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===== ٤ — حالة الطلبات ===== */}
          <section className="bg-paper rounded-lg border border-hairline shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-ink/60" />
                  توزيع الطلبات حسب الحالة
                </span>
              </SectionTitle>
              <button
                type="button"
                onClick={() => void handleDownload("orders", "حالة الطلبات")}
                disabled={downloadingId !== null}
                className="flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink border border-hairline rounded-md px-3 min-h-[44px] h-11 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {downloadingId === "orders" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">تحميل</span>
              </button>
            </div>

            {data.ordersByStatus.length === 0 ? (
              <p className="text-sm text-ink/45 text-center py-6">لا توجد طلبات مسجّلة بعد</p>
            ) : (
              <div className="divide-y divide-hairline">
                {data.ordersByStatus.map((row) => (
                  <div key={row.status} className="flex items-center gap-4 py-3">
                    <span className={`px-2.5 py-1 rounded text-[11px] font-bold flex-shrink-0 ${statusColors[row.status] ?? "bg-canvas text-ink/60"}`}>
                      {row.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <ProgressBar pct={row.pct} colorClass={
                        row.status === "delivered" ? "bg-info" :
                        row.status === "confirmed" ? "bg-info/80" :
                        row.status === "sent" ? "bg-info/60" :
                        row.status === "draft" ? "bg-warn" : "bg-alert"
                      } />
                    </div>
                    <span className="text-xs text-ink/45 w-8 text-end flex-shrink-0">
                      {row.count}
                    </span>
                    <span className="text-sm font-bold text-ink w-28 text-end flex-shrink-0">
                      <AmountText amount={row.totalCents} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===== ٥ — أكثر المنتجات طلباً ===== */}
          <section className="bg-paper rounded-lg border border-hairline shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-ink/60" />
                  أكثر المنتجات طلباً (أعلى 15)
                </span>
              </SectionTitle>
              <button
                type="button"
                onClick={() => void handleDownload("products", "أكثر المنتجات طلباً")}
                disabled={downloadingId !== null}
                className="flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink border border-hairline rounded-md px-3 min-h-[44px] h-11 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {downloadingId === "products" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">تحميل</span>
              </button>
            </div>

            {data.topProducts.length === 0 ? (
              <p className="text-sm text-ink/45 text-center py-6">لا توجد طلبات مسجّلة بعد</p>
            ) : (
              <div className="divide-y divide-hairline">
                {data.topProducts.map((product, idx) => (
                  <div key={product.name} className="flex items-center gap-3 py-3">
                    <span className="text-sm font-bold text-ink/25 w-6 text-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-ink/85 truncate">
                      {product.name}
                    </span>
                    <span className="text-xs text-ink/45 flex-shrink-0">
                      {product.orderCount} طلب
                    </span>
                    <span className="text-sm font-bold text-info flex-shrink-0">
                      <AmountText amount={product.revenueCents} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
