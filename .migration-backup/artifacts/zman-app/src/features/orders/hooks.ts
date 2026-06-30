import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createOrder, deleteOrder, patchOrderStatus, updateOrder } from "./actions";
import { getOrdersQuery, getOrderQuery, getOrdersByMonthQuery } from "./queries";
import type { GetOrdersFilters } from "./queries";

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (filters: GetOrdersFilters) => [...orderKeys.lists(), filters] as const,
  infinite: (filters: Omit<GetOrdersFilters, "cursor">) =>
    [...orderKeys.lists(), "infinite", filters] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  month: (year: number, month: number) => [...orderKeys.all, "month", year, month] as const,
};

export function useOrders(filters: GetOrdersFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => getOrdersQuery(filters),
  });
}

export function useInfiniteOrders(filters: Omit<GetOrdersFilters, "cursor">) {
  return useInfiniteQuery({
    queryKey: orderKeys.infinite(filters),
    queryFn: ({ pageParam }) =>
      getOrdersQuery({ ...filters, cursor: (pageParam as string | null) || undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => getOrderQuery(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: (res) => { if (res.status === "ok") qc.invalidateQueries({ queryKey: orderKeys.all }); },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateOrder,
    onSuccess: (res) => { if (res.status === "ok") qc.invalidateQueries({ queryKey: orderKeys.all }); },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) => deleteOrder(id, updatedAt),
    onSuccess: (res) => { if (res.status === "ok") qc.invalidateQueries({ queryKey: orderKeys.all }); },
  });
}

export function usePatchOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updatedAt, status }: { id: string; updatedAt: string; status: import("./schema").OrderStatus }) =>
      patchOrderStatus(id, updatedAt, status),
    onSuccess: (res) => { if (res.status === "ok") qc.invalidateQueries({ queryKey: orderKeys.all }); },
  });
}
