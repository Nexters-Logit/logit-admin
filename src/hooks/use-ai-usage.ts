import { useQuery } from "@tanstack/react-query";

export interface AIUsageData {
  today: { input: number; output: number; calls: number };
  thirtyDays: { input: number; output: number; calls: number };
  daily: { date: string; input: number; output: number; calls: number }[];
  byEndpoint: { endpoint: string; input: number; output: number; calls: number }[];
  byPlan: { plan: string; input: number; output: number; calls: number }[];
  bySubType: { type: string; input: number; output: number; calls: number }[];
}

export function useAIUsage() {
  return useQuery<AIUsageData>({
    queryKey: ["ai-usage"],
    queryFn: async () => {
      const res = await fetch("/api/ai-usage");
      if (!res.ok) throw new Error("Failed to fetch AI usage");
      return res.json();
    },
  });
}
