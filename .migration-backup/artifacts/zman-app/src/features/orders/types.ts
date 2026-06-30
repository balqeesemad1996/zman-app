export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  totalCostCents: number;
  overheadCostCents: number;
  totalPriceCents: number;
  status: "draft" | "sent" | "confirmed" | "delivered" | "cancelled";
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrderComponent {
  id: string;
  orderId: string;
  name: string;
  quantity: number;
  unitCostCents: number;
}

export interface OrderWithComponents extends Order {
  components: OrderComponent[];
}
