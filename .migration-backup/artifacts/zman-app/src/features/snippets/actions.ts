import { api, ApiError } from "@/lib/api";

export type ActionResponse<T = unknown> =
  | { status: "ok"; data: T }
  | { status: "error"; message: string };

export async function createSnippet(input: unknown): Promise<ActionResponse> {
  try {
    return await api.post<ActionResponse>("/snippets", input);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function updateSnippet(input: unknown): Promise<ActionResponse> {
  const d = input as Record<string, unknown>;
  const id = String(d.id);
  const body = { ...d };
  delete body.id;
  try {
    return await api.patch<ActionResponse>(`/snippets/${id}`, body);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}

export async function deleteSnippet(id: string): Promise<ActionResponse> {
  try {
    return await api.delete<ActionResponse>(`/snippets/${id}`);
  } catch (err) {
    return { status: "error", message: err instanceof ApiError ? err.message : String(err) };
  }
}
