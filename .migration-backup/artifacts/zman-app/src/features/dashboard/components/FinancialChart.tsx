import { useMemo, useRef, useState } from "react";
import { AmountText } from "@/components/shared/AmountText";

interface FinancialChartProps {
  salesData: { day: string; total: number }[];
  expensesData: { day: string; total: number }[];
  purchasesData: { day: string; total: number }[];
  startDate: string;
  endDate: string;
}

export default function FinancialChart({
  salesData,
  expensesData,
  purchasesData,
  startDate,
  endDate,
}: FinancialChartProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const datesMap: Record<string, { sales: number; outgoings: number }> = {};

    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0] ?? "";
      if (key) datesMap[key] = { sales: 0, outgoings: 0 };
    }

    for (const item of salesData) {
      const entry = datesMap[item.day];
      if (entry) entry.sales += item.total;
    }
    for (const item of expensesData) {
      const entry = datesMap[item.day];
      if (entry) entry.outgoings += item.total;
    }
    for (const item of purchasesData) {
      const entry = datesMap[item.day];
      if (entry) entry.outgoings += item.total;
    }

    return Object.entries(datesMap)
      .map(([date, val]) => ({ dateStr: date, sales: val.sales, outgoings: val.outgoings }))
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [salesData, expensesData, purchasesData, startDate, endDate]);

  const maxVal = useMemo(() => {
    let max = 1000;
    for (const item of chartData) {
      if (item.sales > max) max = item.sales;
      if (item.outgoings > max) max = item.outgoings;
    }
    return max;
  }, [chartData]);

  // عرض كل عمود بالبكسل — ثابت ليُمكّن التمرير الأفقي الداخلي
  const BAR_COL_WIDTH = 28; // px
  const totalWidth = Math.max(chartData.length * BAR_COL_WIDTH, 280);

  const selectedItem = selectedDate
    ? chartData.find((d) => d.dateStr === selectedDate)
    : null;

  return (
    <div className="bg-paper rounded-lg border border-hairline shadow-sm overflow-hidden">
      {/* الرأس */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
        <h3 className="text-sm font-bold text-ink">مخطط التدفق المالي اليومي</h3>
        <div className="flex gap-4 text-xs font-semibold text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-info rounded-sm shrink-0" />
            مبيعات
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-alert rounded-sm shrink-0" />
            تكاليف
          </span>
        </div>
      </div>

      {/* بطاقة التفاصيل عند اختيار يوم */}
      {selectedItem && (
        <div className="flex items-center justify-between px-5 py-3 bg-canvas border-b border-hairline text-sm">
          <span className="font-semibold text-ink-2">{selectedItem.dateStr}</span>
          <div className="flex gap-4">
            <span className="text-info font-bold">
              <AmountText amount={selectedItem.sales} />
            </span>
            <span className="text-alert font-bold">
              <AmountText amount={selectedItem.outgoings} />
            </span>
          </div>
        </div>
      )}

      {/* منطقة المخطط — قابلة للتمرير أفقياً داخلياً */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overscroll-x-contain pb-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="relative flex items-end pt-8 px-4 pb-4"
          style={{ width: `${totalWidth + 32}px`, height: "192px" }}
        >
          {/* خطوط الشبكة الأفقية */}
          <div className="absolute inset-x-4 top-8 bottom-8 flex flex-col justify-between pointer-events-none">
            {[maxVal, maxVal * 0.5, 0].map((v) => (
              <div key={v} className="relative flex items-center">
                <div className="absolute inset-x-0 border-t border-hairline/60" />
                <span className="absolute end-0 text-[9px] text-ink-3 bg-paper pe-0.5 leading-none select-none">
                  <AmountText amount={v} />
                </span>
              </div>
            ))}
          </div>

          {/* الأعمدة */}
          <div className="absolute inset-x-4 top-8 bottom-8 flex items-end gap-0.5">
            {chartData.map((item, idx) => {
              const salesH = `${(item.sales / maxVal) * 100}%`;
              const outH = `${(item.outgoings / maxVal) * 100}%`;
              const dayNum = item.dateStr.split("-")[2];
              const isSelected = selectedDate === item.dateStr;
              // أظهر رقم اليوم كل 5 أيام، أو للأول والأخير
              const showLabel =
                idx === 0 ||
                idx === chartData.length - 1 ||
                Number(dayNum) % 5 === 0;

              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(isSelected ? null : item.dateStr)}
                  className={`flex flex-col items-center justify-end h-full focus:outline-none group transition-opacity ${
                    isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ width: `${BAR_COL_WIDTH}px`, minWidth: `${BAR_COL_WIDTH}px` }}
                  aria-label={`${item.dateStr}: مبيعات ${item.sales} تكاليف ${item.outgoings}`}
                >
                  {/* الأعمدة نفسها */}
                  <div className="flex items-end justify-center gap-[2px] flex-1 w-full">
                    <div
                      style={{ height: salesH }}
                      className={`w-2.5 bg-info rounded-t-sm transition-all duration-150 ${
                        isSelected ? "opacity-100 ring-1 ring-info/50" : "group-hover:opacity-90"
                      }`}
                    />
                    <div
                      style={{ height: outH }}
                      className={`w-2.5 bg-alert rounded-t-sm transition-all duration-150 ${
                        isSelected ? "opacity-100 ring-1 ring-alert/50" : "group-hover:opacity-90"
                      }`}
                    />
                  </div>
                  {/* رقم اليوم */}
                  <span className={`text-[9px] font-mono mt-1 select-none transition-colors ${
                    isSelected ? "text-ink font-bold" : showLabel ? "text-ink-3" : "text-transparent"
                  }`}>
                    {dayNum}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* تلميح التمرير على الموبايل */}
      <div className="lg:hidden px-5 pb-3 text-[10px] text-ink-3 text-center">
        اسحب يميناً ويساراً لعرض كل الأيام · اضغط على عمود لمشاهدة التفاصيل
      </div>
    </div>
  );
}
