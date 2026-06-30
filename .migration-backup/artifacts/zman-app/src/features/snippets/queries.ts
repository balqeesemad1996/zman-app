import { api } from "@/lib/api";

export interface Snippet {
  id: string;
  title: string;
  body: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export async function getSnippets(search?: string): Promise<{ items: Snippet[] }> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const qs = params.toString();
  return api.get<{ items: Snippet[] }>(`/snippets${qs ? `?${qs}` : ""}`);
}
