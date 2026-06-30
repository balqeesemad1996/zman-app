"use client";

import { useMemo, useState } from "react";
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

  const chartData = useMemo(() => {
    const datesMap: Record<string, { sales: number; outgoings: number }> = {};

    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0] ?? "";
      if (key) datesMap[key] = { sales: 0, outgoings: 0 };
    }

    for (const item of salesData) {
      if (item.day) {
        const entry = datesMap[item.day];
        if (entry) entry.sales += item.total;
      }
    }
    for (const item of expensesData) {
      if (item.day) {
        const entry = datesMap[item.day];
        if (entry) entry.outgoings += item.total;
      }
    }
    for (const item of purchasesData) {
      if (item.day) {
        const entry = datesMap[item.day];
        if (entry) entry.outgoings += item.total;
      }
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

  const selected = chartData.find((d) => d.dateStr === selectedDate) ?? null;

  return (
    <div className="bg-paper p-4 lg:p-6 rounded-lg border border-hairline shadow-sm space-y-4 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-md font-bold text-ink">مخطط التدفق المالي اليومي</h3>
        <div className="flex gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-info rounded-sm flex-shrink-0" />
            <span className="text-ink/75">المبيعات</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-alert rounded-sm flex-shrink-0" />
            <span className="text-ink/75">التكاليف</span>
          </div>
        </div>
      </div>

      {/* بطاقة القيم للتاريخ المختار */}
      {selected && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-canvas rounded-md border border-hairline text-xs">
          <span className="font-mono text-ink/50">{selected.dateStr}</span>
          <span className="text-info font-bold">
            المبيعات: <AmountText amount={selected.sales} />
          </span>
          <span className="text-alert font-bold">
            التكاليف: <AmountText amount={selected.outgoings} />
          </span>
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="ms-auto text-ink/40 hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      {/* الرسم البياني — overflow-hidden يمنع الانزلاح الأفقي */}
      <div className="relative w-full min-w-0 overflow-hidden">
        {/* خطوط الشبكة الخلفية */}
        <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
          <div className="w-full border-t border-hairline/40 text-[9px] text-ink/35 flex justify-end pe-1 leading-none pt-0.5">
            <AmountText amount={maxVal} />
          </div>
          <div className="w-full border-t border-hairline/40 text-[9px] text-ink/35 flex justify-end pe-1 leading-none pt-0.5">
            <AmountText amount={maxVal / 2} />
          </div>
          <div className="w-full border-t border-hairline text-[9px] text-ink/35 flex justify-end pe-1 leading-none">
            <span>٠</span>
          </div>
        </div>

        {/* الأعمدة */}
        <div className="h-52 flex items-end pb-6 pt-2 gap-px">
          {chartData.map((item) => {
            const salesPct = maxVal > 0 ? (item.sales / maxVal) * 100 : 0;
            const outPct = maxVal > 0 ? (item.outgoings / maxVal) * 100 : 0;
            const dayNum = item.dateStr.split("-")[2];
            const isSelected = selectedDate === item.dateStr;

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : item.dateStr)}
                className="flex-1 min-w-0 flex flex-col items-center justify-end h-full focus:outline-none group"
                title={item.dateStr}
              >
                <div className="w-full flex items-end justify-center gap-px flex-1 min-w-0">
                  <div
                    style={{ height: `${salesPct}%` }}
                    className={`w-[45%] min-w-0 bg-info rounded-t-[2px] transition-all duration-150
                      ${isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-90"}
                    `}
                  />
                  <div
                    style={{ height: `${outPct}%` }}
                    className={`w-[45%] min-w-0 bg-alert rounded-t-[2px] transition-all duration-150
                      ${isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-90"}
                    `}
                  />
                </div>
                <span className="text-[8px] text-ink/40 font-mono mt-0.5 select-none leading-none block">
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
