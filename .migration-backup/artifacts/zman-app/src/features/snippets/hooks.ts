import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSnippets } from "./queries";
import { createSnippet, updateSnippet, deleteSnippet } from "./actions";

export const snippetKeys = {
  all: ["snippets"] as const,
  list: (search?: string) => [...snippetKeys.all, "list", search ?? ""] as const,
};

export function useSnippets(search?: string) {
  return useQuery({
    queryKey: snippetKeys.list(search),
    queryFn: () => getSnippets(search),
    select: (d) => d.items,
  });
}

export function useCreateSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSnippet,
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.all }),
  });
}

export function useUpdateSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSnippet,
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.all }),
  });
}

export function useDeleteSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSnippet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: snippetKeys.all }),
  });
}
