import { api } from "@/lib/api";
import type { Order, OrderWithComponents } from "./types";

export interface GetOrdersFilters {
  status?: string;
  q?: string;
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
}

export interface OrdersPage {
  items: Order[];
  nextCursor?: string;
}

export async function getOrdersQuery(filters: GetOrdersFilters = {}): Promise<OrdersPage> {
  return api.get<OrdersPage>("/orders", {
    status: filters.status,
    q: filters.q,
    cursor: filters.cursor,
    limit: filters.limit,
  });
}

export async function getOrdersByMonthQuery(year: number, month: number): Promise<Order[]> {
  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
  const result = await api.get<OrdersPage>("/orders", { from, to, limit: 200 });
  return result.items;
}

export async function getOrderQuery(id: string): Promise<OrderWithComponents | null> {
  try {
    return await api.get<OrderWithComponents>(`/orders/${id}`);
  } catch {
    return null;
  }
}
