import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type QaRoundStatus = "in_progress" | "closed";

export interface QaRound {
  id: string;
  name: string;
  description: string | null;
  status: QaRoundStatus;
  created_by: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  items: { status: "pass" | "fail" | "blocked" | null }[];
}

export interface QaRoundFormData {
  name: string;
  description?: string;
  sourceCaseIds?: string[];
}

export function useQaRounds() {
  return useQuery<QaRound[]>({
    queryKey: ["qa-rounds"],
    queryFn: async () => {
      const res = await fetch("/api/qa-sheet/rounds");
      if (!res.ok) throw new Error("Failed to fetch QA rounds");
      return res.json();
    },
  });
}

export function useQaRound(roundId: string | undefined) {
  return useQuery<QaRound>({
    queryKey: ["qa-round", roundId],
    queryFn: async () => {
      const res = await fetch(`/api/qa-sheet/rounds/${roundId}`);
      if (!res.ok) throw new Error("Failed to fetch QA round");
      return res.json();
    },
    enabled: !!roundId,
  });
}

export function useCreateQaRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: QaRoundFormData) => {
      const res = await fetch("/api/qa-sheet/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create QA round");
      return res.json() as Promise<QaRound>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-rounds"] }),
  });
}

export function useUpdateQaRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string; name?: string; description?: string; status?: QaRoundStatus }) => {
      const res = await fetch(`/api/qa-sheet/rounds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update QA round");
      return res.json() as Promise<QaRound>;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["qa-rounds"] });
      qc.invalidateQueries({ queryKey: ["qa-round", variables.id] });
    },
  });
}

export function useDeleteQaRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/qa-sheet/rounds/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete QA round");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-rounds"] }),
  });
}
