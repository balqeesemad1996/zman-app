import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  convertOrderToSale,
  createExpense, updateExpense, deleteExpense,
  createPurchase, updatePurchase, deletePurchase,
  createSale, updateSale, deleteSale,
} from "./actions";
import {
  getExpenseCategoriesQuery, getExpenseQuery, getExpensesQuery,
  getPurchaseQuery, getPurchaseSuppliersQuery, getPurchasesQuery,
  getSaleQuery, getSalesQuery,
} from "./queries";
import type { GetExpensesFilters, GetPurchasesFilters, GetSalesFilters } from "./queries";

export const financeKeys = {
  all: ["finance"] as const,
  purchases: () => [...financeKeys.all, "purchases"] as const,
  purchaseList: (f: Omit<GetPurchasesFilters, "cursor">) => [...financeKeys.purchases(), "list", f] as const,
  purchaseDetail: (id: string) => [...financeKeys.purchases(), "detail", id] as const,
  purchaseSuppliers: () => [...financeKeys.purchases(), "suppliers"] as const,
  expenses: () => [...financeKeys.all, "expenses"] as const,
  expenseList: (f: Omit<GetExpensesFilters, "cursor">) => [...financeKeys.expenses(), "list", f] as const,
  expenseDetail: (id: string) => [...financeKeys.expenses(), "detail", id] as const,
  categories: () => [...financeKeys.expenses(), "categories"] as const,
  sales: () => [...financeKeys.all, "sales"] as const,
  saleList: (f: Omit<GetSalesFilters, "cursor">) => [...financeKeys.sales(), "list", f] as const,
  saleDetail: (id: string) => [...financeKeys.sales(), "detail", id] as const,
};

export function useInfinitePurchases(filters: Omit<GetPurchasesFilters, "cursor">) {
  return useInfiniteQuery({
    queryKey: financeKeys.purchaseList(filters),
    queryFn: ({ pageParam }) => getPurchasesQuery({ ...filters, cursor: (pageParam as string | null) || undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.nextCursor ?? null,
  });
}
export function usePurchase(id: string) {
  return useQuery({ queryKey: financeKeys.purchaseDetail(id), queryFn: () => getPurchaseQuery(id), enabled: !!id });
}
export function usePurchaseSuppliers() {
  return useQuery({ queryKey: financeKeys.purchaseSuppliers(), queryFn: getPurchaseSuppliersQuery });
}
export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createPurchase, onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.purchases() }) });
}
export function useUpdatePurchase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: updatePurchase, onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.purchases() }) });
}
export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) => deletePurchase(id, updatedAt), onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.purchases() }) });
}

export function useInfiniteExpenses(filters: Omit<GetExpensesFilters, "cursor">) {
  return useInfiniteQuery({
    queryKey: financeKeys.expenseList(filters),
    queryFn: ({ pageParam }) => getExpensesQuery({ ...filters, cursor: (pageParam as string | null) || undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.nextCursor ?? null,
  });
}
export function useExpense(id: string) {
  return useQuery({ queryKey: financeKeys.expenseDetail(id), queryFn: () => getExpenseQuery(id), enabled: !!id });
}
export function useExpenseCategories() {
  return useQuery({ queryKey: financeKeys.categories(), queryFn: getExpenseCategoriesQuery });
}
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createExpense, onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.expenses() }) });
}
export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: updateExpense, onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.expenses() }) });
}
export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) => deleteExpense(id, updatedAt), onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.expenses() }) });
}

export function useInfiniteSales(filters: Omit<GetSalesFilters, "cursor">) {
  return useInfiniteQuery({
    queryKey: financeKeys.saleList(filters),
    queryFn: ({ pageParam }) => getSalesQuery({ ...filters, cursor: (pageParam as string | null) || undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.nextCursor ?? null,
  });
}
export function useSale(id: string) {
  return useQuery({ queryKey: financeKeys.saleDetail(id), queryFn: () => getSaleQuery(id), enabled: !!id });
}
export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createSale, onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.sales() }) });
}
export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: updateSale, onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.sales() }) });
}
export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) => deleteSale(id, updatedAt), onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.sales() }) });
}

export function useConvertOrderToSale() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: convertOrderToSale, onSuccess: () => { qc.invalidateQueries({ queryKey: financeKeys.sales() }); qc.invalidateQueries({ queryKey: ["orders"] }); } });
}
