export interface Purchase {
  id: string;
  date: string;
  item: string;
  supplier: string;
  quantity: number;
  unitCostCents: number;
  totalCents: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type NewPurchase = Omit<Purchase, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export interface Expense {
  id: string;
  date: string;
  category: string;
  amountCents: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type NewExpense = Omit<Expense, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export interface Sale {
  id: string;
  date: string;
  source: "manual" | "order";
  orderId: string | null;
  description: string;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type NewSale = Omit<Sale, "id" | "createdAt" | "updatedAt" | "deletedAt">;
