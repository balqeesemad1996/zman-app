import { api, ApiError } from "@/lib/api";
import type { OrderStatus } from "./schema";
import type { OrderComponent } from "./types";

export type ActionResponse<T = unknown> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

function mapComponents(components: unknown[]) {
  return components.map((c) => {
    const comp = c as Record<string, unknown>;
    return {
      id: comp.id,
      name: comp.name,
      quantity: Number(comp.quantity) || 1,
      unitCostCents: Number(comp.unitCostCents ?? comp.costCents) || 0,
    };
  });
}

export async function createOrder(rawInput: unknown): Promise<ActionResponse> {
  const input = rawInput as Record<string, unknown>;
  const body = {
    ...input,
    components: mapComponents((input.components as unknown[]) || []),
  };
  try {
    const res = await api.post<ActionResponse>("/orders", body);
    return res;
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function updateOrder(rawInput: unknown): Promise<ActionResponse> {
  const input = rawInput as Record<string, unknown>;
  const id = String(input.id);
  const body: Record<string, unknown> = { ...input };
  delete body.id;
  if (body.components) {
    body.components = mapComponents((body.components as unknown[]) || []);
  }
  try {
    const res = await api.patch<ActionResponse>(`/orders/${id}`, body);
    return res;
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function patchOrderStatus(
  id: string,
  updatedAt: string,
  status: OrderStatus,
): Promise<ActionResponse> {
  try {
    const res = await api.patch<ActionResponse>(`/orders/${id}`, { updatedAt, status });
    return res;
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function deleteOrder(id: string, _updatedAt?: string): Promise<ActionResponse> {
  try {
    return await api.delete<ActionResponse>(`/orders/${id}`);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}
