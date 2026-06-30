import { api } from "@/lib/api";

export interface FinancialSummary {
  sales: number;
  expenses: number;
  purchases: number;
  netProfit: number;
}

export interface ActivityItem {
  id: string;
  type: "order" | "sale" | "expense" | "purchase";
  title: string;
  amount: number;
  date: string;
}

export async function getFinancialSummary(
  startDate: string,
  endDate: string,
): Promise<FinancialSummary> {
  return api.get<FinancialSummary>("/dashboard/summary", { startDate, endDate });
}

export async function getRecentActivities(): Promise<ActivityItem[]> {
  return api.get<ActivityItem[]>("/dashboard/activities");
}

export async function getFinancialTrendData(startDate: string, endDate: string) {
  return api.get<{
    salesTrend: { day: string; total: number }[];
    expensesTrend: { day: string; total: number }[];
    purchasesTrend: { day: string; total: number }[];
  }>("/dashboard/trends", { startDate, endDate });
}
