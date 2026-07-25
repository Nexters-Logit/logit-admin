import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface QaTestCase {
  id: string;
  category_l1: string;
  category_l2: string | null;
  category_l3: string | null;
  title: string;
  steps: string;
  expected: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface QaTestCaseFormData {
  category_l1: string;
  category_l2: string;
  category_l3: string;
  title: string;
  steps: string;
  expected: string;
  order?: number;
}

export function useQaCases() {
  return useQuery<QaTestCase[]>({
    queryKey: ["qa-cases"],
    queryFn: async () => {
      const res = await fetch("/api/qa-sheet/cases");
      if (!res.ok) throw new Error("Failed to fetch QA cases");
      return res.json();
    },
  });
}

export function useCreateQaCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: QaTestCaseFormData) => {
      const res = await fetch("/api/qa-sheet/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create QA case");
      return res.json() as Promise<QaTestCase>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-cases"] }),
  });
}

export function useUpdateQaCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<QaTestCaseFormData> & { id: string }) => {
      const res = await fetch(`/api/qa-sheet/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update QA case");
      return res.json() as Promise<QaTestCase>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-cases"] }),
  });
}

export function useClearUnusedQaCases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/qa-sheet/cases", { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error ?? "Failed to clear QA cases");
      }
      return res.json() as Promise<{ deleted: number }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-cases"] }),
  });
}

export function useDeleteQaCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/qa-sheet/cases/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error ?? "Failed to delete QA case");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-cases"] }),
  });
}
