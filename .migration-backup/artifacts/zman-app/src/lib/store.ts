import type { Order, OrderComponent } from "@/features/orders/types";
import type { Purchase, Expense, Sale } from "@/features/finance/types";

const KEYS = {
  orders: "zman_orders",
  components: "zman_order_components",
  purchases: "zman_purchases",
  expenses: "zman_expenses",
  sales: "zman_sales",
};

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function now() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

// ──────────────────────────────────────────────
// Orders
// ──────────────────────────────────────────────

export function getOrders(): Order[] {
  return load<Order>(KEYS.orders).filter((o) => !o.deletedAt);
}

export function getOrderById(id: string): Order | undefined {
  return load<Order>(KEYS.orders).find((o) => o.id === id && !o.deletedAt);
}

export function getOrderComponents(orderId: string): OrderComponent[] {
  return load<OrderComponent>(KEYS.components).filter(
    (c) => c.orderId === orderId,
  );
}

export function createOrder(
  data: Omit<Order, "id" | "createdAt" | "updatedAt" | "deletedAt">,
  components: Omit<OrderComponent, "id" | "orderId">[],
): Order {
  const orders = load<Order>(KEYS.orders);
  const id = uuid();
  const ts = now();
  const newOrder: Order = { ...data, id, createdAt: ts, updatedAt: ts, deletedAt: null };
  orders.push(newOrder);
  save(KEYS.orders, orders);

  const comps = load<OrderComponent>(KEYS.components);
  for (const c of components) {
    comps.push({ ...c, id: uuid(), orderId: id });
  }
  save(KEYS.components, comps);
  return newOrder;
}

export function updateOrder(
  id: string,
  data: Partial<Omit<Order, "id" | "createdAt" | "deletedAt">>,
  components?: Omit<OrderComponent, "id" | "orderId">[],
): Order | null {
  const orders = load<Order>(KEYS.orders);
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const updated = { ...orders[idx]!, ...data, updatedAt: now() };
  orders[idx] = updated;
  save(KEYS.orders, orders);

  if (components !== undefined) {
    const comps = load<OrderComponent>(KEYS.components).filter(
      (c) => c.orderId !== id,
    );
    for (const c of components) {
      comps.push({ ...c, id: uuid(), orderId: id });
    }
    save(KEYS.components, comps);
  }
  return updated;
}

export function deleteOrder(id: string): boolean {
  const orders = load<Order>(KEYS.orders);
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return false;
  orders[idx] = { ...orders[idx]!, deletedAt: now() };
  save(KEYS.orders, orders);
  return true;
}

// ──────────────────────────────────────────────
// Purchases
// ──────────────────────────────────────────────

export function getPurchases(): Purchase[] {
  return load<Purchase>(KEYS.purchases).filter((p) => !p.deletedAt);
}

export function getPurchaseById(id: string): Purchase | undefined {
  return load<Purchase>(KEYS.purchases).find((p) => p.id === id && !p.deletedAt);
}

export function createPurchase(
  data: Omit<Purchase, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Purchase {
  const items = load<Purchase>(KEYS.purchases);
  const ts = now();
  const item: Purchase = { ...data, id: uuid(), createdAt: ts, updatedAt: ts, deletedAt: null };
  items.push(item);
  save(KEYS.purchases, items);
  return item;
}

export function updatePurchase(
  id: string,
  data: Partial<Omit<Purchase, "id" | "createdAt" | "deletedAt">>,
): Purchase | null {
  const items = load<Purchase>(KEYS.purchases);
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...items[idx]!, ...data, updatedAt: now() };
  items[idx] = updated;
  save(KEYS.purchases, items);
  return updated;
}

export function deletePurchase(id: string): boolean {
  const items = load<Purchase>(KEYS.purchases);
  const idx = items.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx]!, deletedAt: now() };
  save(KEYS.purchases, items);
  return true;
}

// ──────────────────────────────────────────────
// Expenses
// ──────────────────────────────────────────────

export function getExpenses(): Expense[] {
  return load<Expense>(KEYS.expenses).filter((e) => !e.deletedAt);
}

export function getExpenseById(id: string): Expense | undefined {
  return load<Expense>(KEYS.expenses).find((e) => e.id === id && !e.deletedAt);
}

export function createExpense(
  data: Omit<Expense, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Expense {
  const items = load<Expense>(KEYS.expenses);
  const ts = now();
  const item: Expense = { ...data, id: uuid(), createdAt: ts, updatedAt: ts, deletedAt: null };
  items.push(item);
  save(KEYS.expenses, items);
  return item;
}

export function updateExpense(
  id: string,
  data: Partial<Omit<Expense, "id" | "createdAt" | "deletedAt">>,
): Expense | null {
  const items = load<Expense>(KEYS.expenses);
  const idx = items.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const updated = { ...items[idx]!, ...data, updatedAt: now() };
  items[idx] = updated;
  save(KEYS.expenses, items);
  return updated;
}

export function deleteExpense(id: string): boolean {
  const items = load<Expense>(KEYS.expenses);
  const idx = items.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx]!, deletedAt: now() };
  save(KEYS.expenses, items);
  return true;
}

// ──────────────────────────────────────────────
// Sales
// ──────────────────────────────────────────────

export function getSales(): Sale[] {
  return load<Sale>(KEYS.sales).filter((s) => !s.deletedAt);
}

export function getSaleById(id: string): Sale | undefined {
  return load<Sale>(KEYS.sales).find((s) => s.id === id && !s.deletedAt);
}

export function createSale(
  data: Omit<Sale, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Sale {
  const items = load<Sale>(KEYS.sales);
  const ts = now();
  const item: Sale = { ...data, id: uuid(), createdAt: ts, updatedAt: ts, deletedAt: null };
  items.push(item);
  save(KEYS.sales, items);
  return item;
}

export function updateSale(
  id: string,
  data: Partial<Omit<Sale, "id" | "createdAt" | "deletedAt">>,
): Sale | null {
  const items = load<Sale>(KEYS.sales);
  const idx = items.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const updated = { ...items[idx]!, ...data, updatedAt: now() };
  items[idx] = updated;
  save(KEYS.sales, items);
  return updated;
}

export function deleteSale(id: string): boolean {
  const items = load<Sale>(KEYS.sales);
  const idx = items.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx]!, deletedAt: now() };
  save(KEYS.sales, items);
  return true;
}
