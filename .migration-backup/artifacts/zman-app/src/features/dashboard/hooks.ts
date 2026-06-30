import { useQuery } from "@tanstack/react-query";
import { getFinancialSummary, getFinancialTrendData, getRecentActivities } from "./queries";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (s: string, e: string) => [...dashboardKeys.all, "summary", s, e] as const,
  activities: () => [...dashboardKeys.all, "activities"] as const,
  trend: (s: string, e: string) => [...dashboardKeys.all, "trend", s, e] as const,
};

const DASHBOARD_STALE = 5 * 60 * 1000;

export function useFinancialSummary(startDate: string, endDate: string) {
  return useQuery({ queryKey: dashboardKeys.summary(startDate, endDate), queryFn: () => getFinancialSummary(startDate, endDate), enabled: !!startDate && !!endDate, staleTime: DASHBOARD_STALE });
}
export function useRecentActivities() {
  return useQuery({ queryKey: dashboardKeys.activities(), queryFn: getRecentActivities, staleTime: DASHBOARD_STALE });
}
export function useFinancialTrendData(startDate: string, endDate: string) {
  return useQuery({ queryKey: dashboardKeys.trend(startDate, endDate), queryFn: () => getFinancialTrendData(startDate, endDate), enabled: !!startDate && !!endDate, staleTime: DASHBOARD_STALE });
}
