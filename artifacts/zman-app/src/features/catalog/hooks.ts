"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCatalogComponent,
  deleteCatalogComponent,
  getCatalogComponents,
  updateCatalogComponent,
} from "./actions";
import type { CatalogComponent } from "./db";

export const catalogKeys = {
  all: ["catalog"] as const,
  list: (search?: string) => [...catalogKeys.all, "list", search ?? ""] as const,
};

export function useCatalogComponents(search?: string) {
  return useQuery({
    queryKey: catalogKeys.list(search),
    queryFn: () => getCatalogComponents(search),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useCreateCatalogComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Omit<CatalogComponent, "id" | "createdAt" | "updatedAt" | "deletedAt">) =>
      createCatalogComponent(values),
    onSuccess: (res) => {
      if (res.status === "ok") {
        queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      }
    },
  });
}

export function useUpdateCatalogComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CatalogComponent) =>
      updateCatalogComponent(values),
    onSuccess: (res) => {
      if (res.status === "ok") {
        queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      }
    },
  });
}

export function useDeleteCatalogComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updatedAt }: { id: string; updatedAt: string }) =>
      deleteCatalogComponent(id, updatedAt),
    onSuccess: (res) => {
      if (res.status === "ok") {
        queryClient.invalidateQueries({ queryKey: catalogKeys.all });
      }
    },
  });
}
