export interface CatalogComponent {
  id: string;
  name: string;
  defaultCostCents: number;
  unit: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type NewCatalogComponent = Pick<CatalogComponent, "name" | "defaultCostCents" | "unit" | "notes">;
