import { api, ApiError } from "@/lib/api";

export type ActionResponse<T = unknown> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

export async function createCatalogComponent(input: unknown): Promise<ActionResponse> {
  try {
    return await api.post<ActionResponse>("/catalog", input);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function updateCatalogComponent(input: unknown): Promise<ActionResponse> {
  const d = input as Record<string, unknown>;
  const id = String(d.id);
  const body = { ...d };
  delete body.id;
  try {
    return await api.patch<ActionResponse>(`/catalog/${id}`, body);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function deleteCatalogComponent(id: string): Promise<ActionResponse> {
  try {
    return await api.delete<ActionResponse>(`/catalog/${id}`);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}
