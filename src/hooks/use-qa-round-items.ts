import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface QaRoundItem {
  round_id: string;
  case_id: string;
  category_l1: string;
  category_l2: string | null;
  category_l3: string | null;
  title: string;
  steps: string;
  expected: string;
  tester_email: string | null;
  status: "pass" | "fail" | "blocked" | null;
  device: string | null;
  situation: string | null;
  screenshot_url: string | null;
  detail: string | null;
  confirmed: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  checks: QaRoundItemCheck[];
  my_check: QaRoundItemCheck | null;
}

export interface QaRoundItemCheck {
  id: string;
  round_id: string;
  case_id: string;
  tester_email: string;
  status: "pass" | "fail" | "blocked" | null;
  device: string | null;
  situation: string | null;
  screenshot_url: string | null;
  detail: string | null;
  confirmed: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type QaRoundItemPatch = Partial<
  Pick<
    QaRoundItem,
    | "category_l1"
    | "category_l2"
    | "category_l3"
    | "title"
    | "steps"
    | "expected"
    | "tester_email"
    | "status"
    | "device"
    | "situation"
    | "screenshot_url"
    | "detail"
    | "confirmed"
  >
>;

export function useQaRoundItems(roundId: string | undefined) {
  return useQuery<QaRoundItem[]>({
    queryKey: ["qa-round-items", roundId],
    queryFn: async () => {
      const res = await fetch(`/api/qa-sheet/rounds/${roundId}/items`);
      if (!res.ok) throw new Error("Failed to fetch QA round items");
      return res.json();
    },
    enabled: !!roundId,
  });
}

export function useAddCasesToRound(roundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (caseIds: string[]) => {
      const res = await fetch(`/api/qa-sheet/rounds/${roundId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseIds }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error ?? "Failed to add cases to round");
      }
      return res.json() as Promise<QaRoundItem[]>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-round-items", roundId] }),
  });
}

export function useUpdateQaRoundItem(roundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseId, patch }: { caseId: string; patch: QaRoundItemPatch }) => {
      const res = await fetch(`/api/qa-sheet/rounds/${roundId}/items/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error ?? "Failed to update QA round item");
      }
      return res.json() as Promise<QaRoundItem>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-round-items", roundId] }),
  });
}

export type QaRoundItemCheckPatch = Partial<
  Pick<
    QaRoundItemCheck,
    "status" | "device" | "situation" | "screenshot_url" | "detail" | "confirmed"
  >
>;

export function useUpdateMyQaRoundItemCheck(roundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseId, patch }: { caseId: string; patch: QaRoundItemCheckPatch }) => {
      const res = await fetch(`/api/qa-sheet/rounds/${roundId}/items/${caseId}/checks/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error ?? "Failed to update my QA check");
      }
      return res.json() as Promise<QaRoundItemCheck>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-round-items", roundId] }),
  });
}

export interface QaRoundImportRow {
  category_l1: string;
  category_l2?: string;
  category_l3?: string;
  title: string;
  steps: string;
  expected: string;
}

export interface QaRoundImportResult {
  casesCreated: number;
  casesReused: number;
  itemsAdded: number;
  itemsSkipped: number;
}

export function useImportQaRoundItems(roundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: QaRoundImportRow[]) => {
      const res = await fetch(`/api/qa-sheet/rounds/${roundId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error ?? "Failed to import QA CSV");
      }
      return res.json() as Promise<QaRoundImportResult>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qa-round-items", roundId] });
      qc.invalidateQueries({ queryKey: ["qa-cases"] });
    },
  });
}

export function useRemoveCaseFromRound(roundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (caseId: string) => {
      const res = await fetch(`/api/qa-sheet/rounds/${roundId}/items/${caseId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        throw new Error(error ?? "Failed to remove case from round");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa-round-items", roundId] }),
  });
}
