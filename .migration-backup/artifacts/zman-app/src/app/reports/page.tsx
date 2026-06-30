import {
  Archive,
  BarChart2,
  Download,
  ListFilter,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { AmountText } from "@/components/shared/AmountText";
import { orderStatusLabels } from "@/features/orders/schema";
import { downloadReport } from "@/features/reports/actions";
import { useReportData } from "@/features/reports/queries";
import type { ExpenseRow, OrderRow, PurchaseRow, SaleRow } from "@/features/reports/queries";

type TabId = "pnl" | "expenses" | "sales" | "orders" | "products";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "pnl", label: "الأرباح والخسائر", icon: TrendingUp },
  { id: "expenses", label: "المصاريف", icon: Wallet },
  { id: "sales", label: "المبيعات", icon: BarChart2 },
  { id: "orders", label: "الطلبات", icon: ListFilter },
  { id: "products", label: "المنتجات", icon: Archive },
];

function getDefaultDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: start.toISOString().split("T")[0]!,
    end: now.toISOString().split("T")[0]!,
  };
}

export default function ReportsPage() {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [activeTab, setActiveTab] = useState<TabId>("pnl");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useReportData(startDate, endDate);

  const handleDownload = async (type: TabId) => {
    setDownloadingId(type);
    try {
      const res = await downloadReport(type);
      if (res.status === "ok" && res.data) {
        const blob = new Blob([res.data], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `تقرير_${type}_${endDate}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("تم تحميل التقرير");
      } else {
        toast.error("فشل تحميل التقرير");
      }
    } catch {
      toast.error("خطأ في الاتصال بالسيرفر");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AppShell title="التقارير المالية والتشغيلية">
      <div className="space-y-4">
        {/* فلتر نطاق التاريخ */}
        <div className="bg-paper border border-hairline rounded-lg p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
            <label className="text-xs font-semibold text-ink-3">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 rounded-md border border-hairline-2 bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
            <label className="text-xs font-semibold text-ink-3">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 rounded-md border border-hairline-2 bg-paper text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </div>
          <button
            type="button"
            onClick={() => { setStartDate(defaults.start); setEndDate(defaults.end); }}
            className="h-10 px-4 rounded-md border border-hairline-2 text-sm text-ink-2 hover:bg-canvas transition-colors"
          >
            الشهر الحالي
          </button>
        </div>

        {/* تبويبات التقارير */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-info text-paper"
                    : "bg-paper border border-hairline text-ink-2 hover:bg-canvas"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* المحتوى */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-ink-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>جاري تحميل بيانات التقرير...</span>
          </div>
        ) : isError || !data ? (
          <div className="text-center py-20 text-alert text-sm">
            فشل تحميل البيانات. يرجى المحاولة مرة أخرى.
          </div>
        ) : (
          <div className="space-y-4">
            {/* زر التحميل */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleDownload(activeTab)}
                disabled={downloadingId !== null}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-hairline-2 text-sm text-ink-2 hover:bg-canvas transition-colors disabled:opacity-50"
              >
                {downloadingId === activeTab ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                تحميل Markdown
              </button>
            </div>

            {activeTab === "pnl" && <PnlReport sales={data.sales} expenses={data.expenses} purchases={data.purchases} />}
            {activeTab === "expenses" && <ExpensesReport expenses={data.expenses} />}
            {activeTab === "sales" && <SalesReport sales={data.sales} />}
            {activeTab === "orders" && <OrdersReport orders={data.orders} />}
            {activeTab === "products" && <ProductsReport orders={data.orders} />}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── مكوّن: بطاقة إحصاء ───────────────────────────────────────────────────
function StatCard({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: number;
  variant?: "neutral" | "income" | "cost" | "profit" | "loss";
}) {
  const colorMap = {
    neutral: "bg-paper border-hairline text-ink",
    income: "bg-info-soft border-info/20 text-info",
    cost: "bg-warn-soft border-warn/20 text-warn",
    profit: "bg-success-soft border-success/20 text-success",
    loss: "bg-alert-soft border-alert/20 text-alert",
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[variant]}`}>
      <div className="text-xs font-semibold opacity-70 mb-1">{label}</div>
      <div className="text-xl font-bold">
        <AmountText amount={Math.abs(value)} />
      </div>
    </div>
  );
}

// ─── مكوّن: شريط نسبة ─────────────────────────────────────────────────────
function PercentBar({ pct, color = "bg-info" }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden mt-2">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── تقرير P&L ─────────────────────────────────────────────────────────────
function PnlReport({
  sales,
  expenses,
  purchases,
}: { sales: SaleRow[]; expenses: ExpenseRow[]; purchases: PurchaseRow[] }) {
  const totalSales = sales.reduce((s, r) => s + r.amountCents, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amountCents, 0);
  const totalPurchases = purchases.reduce((s, r) => s + r.totalCents, 0);
  const totalOutgoing = totalExpenses + totalPurchases;
  const netProfit = totalSales - totalOutgoing;
  const isProfit = netProfit >= 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="إجمالي المبيعات" value={totalSales} variant="income" />
        <StatCard label="إجمالي المشتريات" value={totalPurchases} variant="cost" />
        <StatCard label="إجمالي المصاريف" value={totalExpenses} variant="cost" />
        <StatCard label="صافي الربح" value={netProfit} variant={isProfit ? "profit" : "loss"} />
      </div>

      <div className="bg-paper border border-hairline rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-canvas">
          <h4 className="text-sm font-bold text-ink">ملخص الأرباح والخسائر</h4>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-hairline">
            <PnlRow label="إجمالي المبيعات" value={totalSales} positive />
            <PnlRow label="مشتريات المواد" value={totalPurchases} />
            <PnlRow label="المصاريف التشغيلية" value={totalExpenses} />
            <PnlRow label="إجمالي التكاليف" value={totalOutgoing} />
            <tr className={`font-bold ${isProfit ? "bg-success-soft text-success" : "bg-alert-soft text-alert"}`}>
              <td className="px-5 py-3">{isProfit ? "صافي الربح" : "صافي الخسارة"}</td>
              <td className="px-5 py-3 text-end">
                <AmountText amount={Math.abs(netProfit)} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {(sales.length > 0 || expenses.length > 0 || purchases.length > 0) && (
        <MonthlySummary sales={sales} expenses={expenses} purchases={purchases} />
      )}
    </div>
  );
}

function PnlRow({ label, value, positive = false }: { label: string; value: number; positive?: boolean }) {
  return (
    <tr className="hover:bg-canvas/50">
      <td className="px-5 py-3 text-ink-2">{label}</td>
      <td className={`px-5 py-3 text-end font-semibold ${positive ? "text-success" : "text-ink"}`}>
        <AmountText amount={value} />
      </td>
    </tr>
  );
}

function MonthlySummary({
  sales,
  expenses,
  purchases,
}: { sales: SaleRow[]; expenses: ExpenseRow[]; purchases: PurchaseRow[] }) {
  const byMonth = useMemo(() => {
    const map: Record<string, { sales: number; expenses: number; purchases: number }> = {};
    const ensure = (m: string) => {
      if (!map[m]) map[m] = { sales: 0, expenses: 0, purchases: 0 };
    };
    for (const r of sales) {
      const m = r.date.slice(0, 7);
      ensure(m);
      map[m]!.sales += r.amountCents;
    }
    for (const r of expenses) {
      const m = r.date.slice(0, 7);
      ensure(m);
      map[m]!.expenses += r.amountCents;
    }
    for (const r of purchases) {
      const m = r.date.slice(0, 7);
      ensure(m);
      map[m]!.purchases += r.totalCents;
    }
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, ...v, net: v.sales - v.expenses - v.purchases }));
  }, [sales, expenses, purchases]);

  if (byMonth.length <= 1) return null;

  return (
    <div className="bg-paper border border-hairline rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-hairline bg-canvas">
        <h4 className="text-sm font-bold text-ink">التفصيل الشهري</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs text-ink-3">
              <th className="px-5 py-2 text-start font-semibold">الشهر</th>
              <th className="px-5 py-2 text-end font-semibold">مبيعات</th>
              <th className="px-5 py-2 text-end font-semibold">تكاليف</th>
              <th className="px-5 py-2 text-end font-semibold">صافي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {byMonth.map(({ month, sales: s, expenses: e, purchases: p, net }) => (
              <tr key={month} className="hover:bg-canvas/50">
                <td className="px-5 py-3 text-ink-2">{month}</td>
                <td className="px-5 py-3 text-end text-success font-medium">
                  <AmountText amount={s} />
                </td>
                <td className="px-5 py-3 text-end text-warn font-medium">
                  <AmountText amount={e + p} />
                </td>
                <td className={`px-5 py-3 text-end font-bold ${net >= 0 ? "text-success" : "text-alert"}`}>
                  <AmountText amount={Math.abs(net)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── تقرير المصاريف ─────────────────────────────────────────────────────────
function ExpensesReport({ expenses }: { expenses: ExpenseRow[] }) {
  const total = expenses.reduce((s, r) => s + r.amountCents, 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] || 0) + e.amountCents;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({ cat, amount, pct: total > 0 ? (amount / total) * 100 : 0 }));
  }, [expenses, total]);

  if (expenses.length === 0) {
    return <EmptyReport message="لا توجد مصاريف في هذه الفترة" />;
  }

  return (
    <div className="space-y-4">
      <StatCard label="إجمالي المصاريف" value={total} variant="cost" />

      <div className="bg-paper border border-hairline rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-canvas">
          <h4 className="text-sm font-bold text-ink">توزيع المصاريف حسب الفئة</h4>
        </div>
        <div className="divide-y divide-hairline">
          {byCategory.map(({ cat, amount, pct }) => (
            <div key={cat} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{cat || "غير محدد"}</span>
                <div className="text-end">
                  <span className="text-sm font-bold text-warn">
                    <AmountText amount={amount} />
                  </span>
                  <span className="text-xs text-ink-3 me-1.5"> {pct.toFixed(1)}%</span>
                </div>
              </div>
              <PercentBar pct={pct} color="bg-warn" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-paper border border-hairline rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-canvas">
          <h4 className="text-sm font-bold text-ink">سجل المصاريف ({expenses.length})</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-3">
                <th className="px-5 py-2 text-start font-semibold">التاريخ</th>
                <th className="px-5 py-2 text-start font-semibold">الفئة</th>
                <th className="px-5 py-2 text-start font-semibold">البيان</th>
                <th className="px-5 py-2 text-end font-semibold">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-canvas/50">
                  <td className="px-5 py-3 text-ink-3 whitespace-nowrap">{e.date}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 bg-warn-soft text-warn text-xs rounded-full font-semibold">
                      {e.category || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-2">{e.description || "—"}</td>
                  <td className="px-5 py-3 text-end font-semibold text-ink">
                    <AmountText amount={e.amountCents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── تقرير المبيعات ─────────────────────────────────────────────────────────
function SalesReport({ sales }: { sales: SaleRow[] }) {
  const total = sales.reduce((s, r) => s + r.amountCents, 0);
  const fromOrders = sales.filter((s) => s.source === "order").reduce((s, r) => s + r.amountCents, 0);
  const manual = total - fromOrders;

  if (sales.length === 0) {
    return <EmptyReport message="لا توجد مبيعات في هذه الفترة" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="إجمالي المبيعات" value={total} variant="income" />
        <StatCard label="من طلبات معتمدة" value={fromOrders} variant="income" />
        <StatCard label="مبيعات مباشرة" value={manual} variant="income" />
      </div>

      {total > 0 && (
        <div className="bg-paper border border-hairline rounded-lg p-5 space-y-3">
          <h4 className="text-sm font-bold text-ink">التوزيع حسب المصدر</h4>
          {fromOrders > 0 && (
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-2">من طلبات</span>
                <span className="font-semibold">{((fromOrders / total) * 100).toFixed(1)}%</span>
              </div>
              <PercentBar pct={(fromOrders / total) * 100} color="bg-info" />
            </div>
          )}
          {manual > 0 && (
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-2">مباشرة</span>
                <span className="font-semibold">{((manual / total) * 100).toFixed(1)}%</span>
              </div>
              <PercentBar pct={(manual / total) * 100} color="bg-success" />
            </div>
          )}
        </div>
      )}

      <div className="bg-paper border border-hairline rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-canvas">
          <h4 className="text-sm font-bold text-ink">سجل المبيعات ({sales.length})</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-3">
                <th className="px-5 py-2 text-start font-semibold">التاريخ</th>
                <th className="px-5 py-2 text-start font-semibold">البيان</th>
                <th className="px-5 py-2 text-start font-semibold">المصدر</th>
                <th className="px-5 py-2 text-end font-semibold">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-canvas/50">
                  <td className="px-5 py-3 text-ink-3 whitespace-nowrap">{s.date}</td>
                  <td className="px-5 py-3 text-ink-2">{s.description || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                      s.source === "order"
                        ? "bg-info-soft text-info"
                        : "bg-success-soft text-success"
                    }`}>
                      {s.source === "order" ? "طلب" : "مباشر"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-end font-semibold text-success">
                    <AmountText amount={s.amountCents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── تقرير الطلبات ──────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-canvas text-ink-3 border border-hairline",
  sent: "bg-info-soft text-info",
  confirmed: "bg-warn-soft text-warn",
  delivered: "bg-success-soft text-success",
  cancelled: "bg-alert-soft text-alert",
};

function OrdersReport({ orders }: { orders: OrderRow[] }) {
  const total = orders.reduce((s, r) => s + r.totalPriceCents, 0);

  const byStatus = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const o of orders) {
      if (!map[o.status]) map[o.status] = { count: 0, revenue: 0 };
      map[o.status]!.count++;
      map[o.status]!.revenue += o.totalPriceCents;
    }
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [orders]);

  if (orders.length === 0) {
    return <EmptyReport message="لا توجد طلبات في هذه الفترة" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-paper border border-hairline rounded-lg p-4">
          <div className="text-xs font-semibold text-ink-3 mb-1">إجمالي الطلبات</div>
          <div className="text-2xl font-bold text-ink">{orders.length}</div>
        </div>
        <StatCard label="إجمالي قيمة الطلبات" value={total} variant="income" />
        {byStatus.slice(0, 2).map(([status, { count }]) => (
          <div key={status} className="bg-paper border border-hairline rounded-lg p-4">
            <div className="text-xs font-semibold text-ink-3 mb-1">
              {orderStatusLabels[status as keyof typeof orderStatusLabels] ?? status}
            </div>
            <div className="text-2xl font-bold text-ink">{count}</div>
          </div>
        ))}
      </div>

      <div className="bg-paper border border-hairline rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-canvas">
          <h4 className="text-sm font-bold text-ink">التوزيع حسب الحالة</h4>
        </div>
        <div className="divide-y divide-hairline">
          {byStatus.map(([status, { count, revenue }]) => (
            <div key={status} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLOR[status] ?? "bg-canvas text-ink-2"}`}>
                  {orderStatusLabels[status as keyof typeof orderStatusLabels] ?? status}
                </span>
                <span className="text-sm text-ink-2">{count} طلب</span>
              </div>
              <span className="text-sm font-bold text-ink">
                <AmountText amount={revenue} />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-paper border border-hairline rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-canvas">
          <h4 className="text-sm font-bold text-ink">قائمة الطلبات ({orders.length})</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs text-ink-3">
                <th className="px-5 py-2 text-start font-semibold">العميل</th>
                <th className="px-5 py-2 text-start font-semibold">المنتج</th>
                <th className="px-5 py-2 text-start font-semibold">الحالة</th>
                <th className="px-5 py-2 text-end font-semibold">السعر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-canvas/50">
                  <td className="px-5 py-3 font-semibold text-ink">{o.customerName}</td>
                  <td className="px-5 py-3 text-ink-2">{o.productName}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${STATUS_COLOR[o.status] ?? "bg-canvas text-ink-2"}`}>
                      {orderStatusLabels[o.status as keyof typeof orderStatusLabels] ?? o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-end font-semibold text-info">
                    <AmountText amount={o.totalPriceCents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── تقرير المنتجات ─────────────────────────────────────────────────────────
function ProductsReport({ orders }: { orders: OrderRow[] }) {
  const products = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const o of orders) {
      if (!map[o.productName]) map[o.productName] = { count: 0, revenue: 0 };
      map[o.productName]!.count += o.quantity;
      map[o.productName]!.revenue += o.totalPriceCents;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 15)
      .map(([name, v], i) => ({ rank: i + 1, name, ...v }));
  }, [orders]);

  const maxRevenue = products[0]?.revenue ?? 0;

  if (products.length === 0) {
    return <EmptyReport message="لا توجد طلبات في هذه الفترة" />;
  }

  return (
    <div className="space-y-4">
      <div className="bg-paper border border-hairline rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-canvas">
          <h4 className="text-sm font-bold text-ink">أكثر المنتجات إيراداً</h4>
        </div>
        <div className="divide-y divide-hairline">
          {products.map(({ rank, name, count, revenue }) => (
            <div key={name} className="px-5 py-4">
              <div className="flex items-center gap-3 mb-1.5">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  rank === 1 ? "bg-warn text-paper" :
                  rank === 2 ? "bg-ink-3 text-paper" :
                  rank === 3 ? "bg-warn-soft text-warn" :
                  "bg-canvas text-ink-3"
                }`}>
                  {rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-ink truncate">{name}</div>
                  <div className="text-xs text-ink-3">{count} وحدة</div>
                </div>
                <div className="text-end shrink-0">
                  <span className="text-sm font-bold text-info">
                    <AmountText amount={revenue} />
                  </span>
                </div>
              </div>
              <div className="me-10">
                <PercentBar
                  pct={maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0}
                  color={rank === 1 ? "bg-info" : "bg-info/50"}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── حالة فارغة ─────────────────────────────────────────────────────────────
function EmptyReport({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-ink-3 text-sm border border-dashed border-hairline-2 rounded-lg bg-paper">
      {message}
    </div>
  );
}
