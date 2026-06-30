import { api, ApiError } from "@/lib/api";

export type ActionResponse<T = unknown> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

// helper: المكوّنات ترسل { values, requestId } للـ create و { id, updatedAt, values } للـ update
// نفك التغليف هنا قبل إرسالها للـ REST API

function unwrapCreate(rawInput: unknown): Record<string, unknown> {
  const d = rawInput as Record<string, unknown>;
  if (d.values && typeof d.values === "object") {
    return d.values as Record<string, unknown>;
  }
  return d;
}

function unwrapUpdate(rawInput: unknown): { id: string; body: Record<string, unknown> } {
  const d = rawInput as Record<string, unknown>;
  const id = String(d.id);
  if (d.values && typeof d.values === "object") {
    return { id, body: d.values as Record<string, unknown> };
  }
  const body = { ...d };
  delete body.id;
  return { id, body };
}

// ── Purchases ─────────────────────────────────
export async function createPurchase(rawInput: unknown): Promise<ActionResponse> {
  try {
    return await api.post<ActionResponse>("/purchases", unwrapCreate(rawInput));
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function updatePurchase(rawInput: unknown): Promise<ActionResponse> {
  const { id, body } = unwrapUpdate(rawInput);
  try {
    return await api.patch<ActionResponse>(`/purchases/${id}`, body);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function deletePurchase(id: string, _updatedAt?: string): Promise<ActionResponse> {
  try {
    return await api.delete<ActionResponse>(`/purchases/${id}`);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

// ── Expenses ──────────────────────────────────
export async function createExpense(rawInput: unknown): Promise<ActionResponse> {
  try {
    return await api.post<ActionResponse>("/expenses", unwrapCreate(rawInput));
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function updateExpense(rawInput: unknown): Promise<ActionResponse> {
  const { id, body } = unwrapUpdate(rawInput);
  try {
    return await api.patch<ActionResponse>(`/expenses/${id}`, body);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function deleteExpense(id: string, _updatedAt?: string): Promise<ActionResponse> {
  try {
    return await api.delete<ActionResponse>(`/expenses/${id}`);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

// ── Sales ─────────────────────────────────────
export async function createSale(rawInput: unknown): Promise<ActionResponse> {
  try {
    return await api.post<ActionResponse>("/sales", unwrapCreate(rawInput));
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function updateSale(rawInput: unknown): Promise<ActionResponse> {
  const { id, body } = unwrapUpdate(rawInput);
  try {
    return await api.patch<ActionResponse>(`/sales/${id}`, body);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function deleteSale(id: string, _updatedAt?: string): Promise<ActionResponse> {
  try {
    return await api.delete<ActionResponse>(`/sales/${id}`);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

// ── Convert order → sale ──────────────────────
export async function convertOrderToSale({ orderId }: { orderId: string; requestId?: string }): Promise<ActionResponse> {
  try {
    return await api.post<ActionResponse>("/sales/convert-order", { orderId });
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}
