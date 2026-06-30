import { useState, useMemo } from "react";
import { DayPicker, DayButton } from "react-day-picker";
import { ar } from "date-fns/locale";
import { format, isSameDay } from "date-fns";
import { X, Plus, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getOrdersByMonthQuery } from "@/features/orders/queries";
import { orderKeys } from "@/features/orders/hooks";
import type { Order } from "@/features/orders/types";
import "react-day-picker/style.css";

interface Props {
  onViewDetail: (order: Order) => void;
  onCreateNew: () => void;
}

function useOrdersByMonth(year: number, month: number) {
  return useQuery({
    queryKey: orderKeys.month(year, month),
    queryFn: () => getOrdersByMonthQuery(year, month),
    staleTime: 1000 * 60 * 5,
  });
}

export function OrdersCalendar({ onViewDetail, onCreateNew }: Props) {
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: monthOrders = [] } = useOrdersByMonth(
    month.getFullYear(),
    month.getMonth(),
  );

  const ordersByDay = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of monthOrders) {
      const key = order.createdAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(order);
    }
    return map;
  }, [monthOrders]);

  const daysWithOrders = useMemo(
    () =>
      [...ordersByDay.keys()].map((k) => new Date(k + "T12:00:00")),
    [ordersByDay],
  );

  const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedDayOrders = selectedDayKey
    ? (ordersByDay.get(selectedDayKey) ?? [])
    : [];

  const handleDayClick = (day: Date) => {
    if (selectedDay && isSameDay(selectedDay, day)) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  return (
    <div className="flex flex-col" dir="rtl">
      <DayPicker
        locale={ar}
        month={month}
        onMonthChange={(m) => {
          setMonth(m);
          setSelectedDay(null);
        }}
        selected={selectedDay ?? undefined}
        onDayClick={handleDayClick}
        modifiers={{ hasOrders: daysWithOrders }}
        showOutsideDays={false}
        classNames={{
          root: "w-full",
          months: "w-full",
          month: "w-full",
          month_caption:
            "flex items-center justify-center py-3 text-base font-bold text-ink relative",
          caption_label: "text-base font-bold",
          nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1 h-full pointer-events-none",
          button_previous:
            "pointer-events-auto p-2 rounded-full hover:bg-canvas text-ink-2 transition-colors",
          button_next:
            "pointer-events-auto p-2 rounded-full hover:bg-canvas text-ink-2 transition-colors",
          weekdays: "flex w-full border-b border-hairline",
          weekday:
            "flex-1 text-center text-xs text-ink-2 py-2 font-medium",
          weeks: "w-full mt-1",
          week: "flex w-full",
          day: "flex-1 flex items-center justify-center py-1",
          outside: "opacity-0 pointer-events-none",
        }}
        components={{
          DayButton: ({ day, modifiers, ...props }) => {
            const isSelected =
              selectedDay ? isSameDay(day.date, selectedDay) : false;
            const isToday = modifiers.today as boolean | undefined;
            const hasOrders = modifiers.hasOrders as boolean | undefined;

            return (
              <button
                {...props}
                onClick={() => handleDayClick(day.date)}
                className={[
                  "relative flex flex-col items-center justify-center rounded-full transition-colors",
                  "w-9 h-9 text-sm select-none",
                  isSelected
                    ? "bg-info text-paper font-bold"
                    : isToday
                      ? "ring-2 ring-info text-info font-bold"
                      : "text-ink hover:bg-canvas",
                ].join(" ")}
              >
                <span>{day.date.getDate()}</span>
                {hasOrders && (
                  <span
                    className={[
                      "absolute bottom-0.5 w-1 h-1 rounded-full",
                      isSelected ? "bg-paper" : "bg-info",
                    ].join(" ")}
                  />
                )}
              </button>
            );
          },
          Chevron: ({ orientation }) =>
            orientation === "left" ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4 rotate-180" />
            ),
        }}
      />

      {selectedDay ? (
        <div className="mt-3 border-t border-hairline">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-bold text-sm text-ink">
              {format(selectedDay, "EEEE، d MMMM yyyy", { locale: ar })}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={onCreateNew}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-info text-paper text-xs font-bold transition-colors hover:bg-info/90"
              >
                <Plus className="w-3.5 h-3.5" />
                طلب جديد
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 rounded-full hover:bg-canvas text-ink-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {selectedDayOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-ink-2 gap-2">
              <p className="text-sm">لا توجد طلبات لهذا اليوم</p>
              <button
                onClick={onCreateNew}
                className="text-sm text-info font-medium hover:underline"
              >
                + إضافة طلب
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {selectedDayOrders.map((order) => (
                <li key={order.id}>
                  <button
                    onClick={() => onViewDetail(order)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-canvas text-right transition-colors"
                  >
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="font-medium text-ink text-sm truncate">
                        {order.customerName}
                      </span>
                      <span className="text-xs text-ink-2 truncate">
                        {order.productName}
                      </span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-ink-2 shrink-0 ms-2" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-6 text-xs text-ink-2">
          اضغط على أي يوم لعرض طلباته
        </div>
      )}
    </div>
  );
}
