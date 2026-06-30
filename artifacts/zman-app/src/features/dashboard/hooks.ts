"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getFinancialSummary,
  getFinancialTrendData,
  getRecentActivities,
} from "./queries";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: (startDate: string, endDate: string) =>
    [...dashboardKeys.all, "summary", startDate, endDate] as const,
  activities: () => [...dashboardKeys.all, "activities"] as const,
  trend: (startDate: string, endDate: string) =>
    [...dashboardKeys.all, "trend", startDate, endDate] as const,
};

export function useFinancialSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: dashboardKeys.summary(startDate, endDate),
    queryFn: () => getFinancialSummary(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useRecentActivities() {
  return useQuery({
    queryKey: dashboardKeys.activities(),
    queryFn: () => getRecentActivities(),
  });
}

export function useFinancialTrendData(startDate: string, endDate: string) {
  return useQuery({
    queryKey: dashboardKeys.trend(startDate, endDate),
    queryFn: () => getFinancialTrendData(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}
