import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCatalogQuery } from "./queries";
import { createCatalogComponent, updateCatalogComponent, deleteCatalogComponent } from "./actions";
import type { GetCatalogFilters } from "./queries";

export const catalogKeys = {
  all: ["catalog"] as const,
  list: (f: Omit<GetCatalogFilters, "cursor">) => [...catalogKeys.all, "list", f] as const,
};

export function useInfiniteCatalog(filters: Omit<GetCatalogFilters, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: catalogKeys.list(filters),
    queryFn: ({ pageParam }) =>
      getCatalogQuery({ ...filters, cursor: (pageParam as string | null) || undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (p) => p.nextCursor ?? null,
  });
}

export function useCreateCatalogComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCatalogComponent,
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  });
}

export function useUpdateCatalogComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateCatalogComponent,
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  });
}

export function useDeleteCatalogComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCatalogComponent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: catalogKeys.all }),
  });
}
