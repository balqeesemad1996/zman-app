import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SaleRow {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  source: string;
  orderId: string | null;
}

export interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  amountCents: number;
  description: string;
}

export interface PurchaseRow {
  id: string;
  date: string;
  item: string;
  supplier: string;
  quantity: number;
  unitCostCents: number;
  totalCents: number;
}

export interface OrderRow {
  id: string;
  customerName: string;
  productName: string;
  quantity: number;
  status: string;
  totalPriceCents: number;
  totalCostCents: number;
  overheadCostCents: number;
  createdAt: string;
}

export interface ReportData {
  sales: SaleRow[];
  expenses: ExpenseRow[];
  purchases: PurchaseRow[];
  orders: OrderRow[];
}

export function useReportData(startDate: string, endDate: string) {
  return useQuery<ReportData>({
    queryKey: ["reports", startDate, endDate],
    queryFn: async () => {
      const [salesRes, expensesRes, purchasesRes, ordersRes] = await Promise.all([
        api.get<{ items: SaleRow[] }>("/sales", { startDate, endDate, limit: 1000 }),
        api.get<{ items: ExpenseRow[] }>("/expenses", { startDate, endDate, limit: 1000 }),
        api.get<{ items: PurchaseRow[] }>("/purchases", { startDate, endDate, limit: 1000 }),
        api.get<{ items: OrderRow[] }>("/orders", { from: startDate, to: endDate, limit: 1000 }),
      ]);
      return {
        sales: salesRes.items,
        expenses: expensesRes.items,
        purchases: purchasesRes.items,
        orders: ordersRes.items,
      };
    },
    staleTime: 60_000,
  });
}
