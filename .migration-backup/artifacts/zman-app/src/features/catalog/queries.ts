import { api } from "@/lib/api";
import type { CatalogComponent } from "./types";

interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export interface GetCatalogFilters {
  cursor?: string;
  limit?: number;
  search?: string;
}

export async function getCatalogQuery(filters: GetCatalogFilters = {}): Promise<Page<CatalogComponent>> {
  return api.get<Page<CatalogComponent>>("/catalog", {
    cursor: filters.cursor,
    limit: filters.limit,
    search: filters.search,
  });
}

export async function getCatalogComponentQuery(id: string): Promise<CatalogComponent> {
  return api.get<CatalogComponent>(`/catalog/${id}`);
}
