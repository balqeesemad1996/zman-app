import { api } from "@/lib/api";
import type { Purchase, Expense, Sale } from "./types";

export interface GetPurchasesFilters {
  cursor?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  supplier?: string;
}

export interface GetExpensesFilters {
  cursor?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  category?: string;
}

export interface GetSalesFilters {
  cursor?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  source?: "manual" | "order";
}

interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export async function getPurchasesQuery(filters: GetPurchasesFilters): Promise<Page<Purchase>> {
  return api.get<Page<Purchase>>("/purchases", {
    cursor: filters.cursor,
    limit: filters.limit,
    startDate: filters.startDate,
    endDate: filters.endDate,
    search: filters.search,
    supplier: filters.supplier,
  });
}

export async function getPurchaseQuery(id: string): Promise<Purchase | null> {
  try {
    return await api.get<Purchase>(`/purchases/${id}`);
  } catch {
    return null;
  }
}

export async function getPurchaseSuppliersQuery(): Promise<string[]> {
  return api.get<string[]>("/purchases/suppliers");
}

export async function getExpensesQuery(filters: GetExpensesFilters): Promise<Page<Expense>> {
  return api.get<Page<Expense>>("/expenses", {
    cursor: filters.cursor,
    limit: filters.limit,
    startDate: filters.startDate,
    endDate: filters.endDate,
    search: filters.search,
    category: filters.category,
  });
}

export async function getExpenseQuery(id: string): Promise<Expense | null> {
  try {
    return await api.get<Expense>(`/expenses/${id}`);
  } catch {
    return null;
  }
}

export async function getExpenseCategoriesQuery(): Promise<string[]> {
  return api.get<string[]>("/expenses/categories");
}

export async function getSalesQuery(filters: GetSalesFilters): Promise<Page<Sale>> {
  return api.get<Page<Sale>>("/sales", {
    cursor: filters.cursor,
    limit: filters.limit,
    startDate: filters.startDate,
    endDate: filters.endDate,
    search: filters.search,
    source: filters.source,
  });
}

export async function getSaleQuery(id: string): Promise<Sale | null> {
  try {
    return await api.get<Sale>(`/sales/${id}`);
  } catch {
    return null;
  }
}
