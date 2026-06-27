import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface BannerCompare {
  devBanners: Banner[];
  prodBanners?: Banner[];
  devOnlyBanners: Banner[];
  prodConfigured: boolean;
}

export interface Banner {
  id: number;
  image_url: string;
  link_url: string | null;
  is_visible: boolean;
  display_order: number;
  created_at: string;
}

export interface BannerFormData {
  image_url: string;
  link_url: string;
  is_visible: boolean;
  display_order: number;
}

export function useBanners() {
  return useQuery<Banner[]>({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await fetch("/api/banners");
      if (!res.ok) throw new Error("Failed to fetch banners");
      return res.json();
    },
  });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BannerFormData) => {
      const res = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create banner");
      return res.json() as Promise<Banner>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<BannerFormData> & { id: number }) => {
      const res = await fetch(`/api/banners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update banner");
      return res.json() as Promise<Banner>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/banners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete banner");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
}

export function useBannerCompare() {
  return useQuery<BannerCompare>({
    queryKey: ["banners", "compare"],
    queryFn: async () => {
      const res = await fetch("/api/banners/compare");
      if (!res.ok) throw new Error("Failed to compare banners");
      return res.json();
    },
  });
}

export function useDeployBanners() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch("/api/banners/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to deploy banners");
      }
      return res.json() as Promise<{ deployed: number; skipped: number }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banners"] });
    },
  });
}

export function useReorderBanners() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch("/api/banners/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Failed to reorder banners");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
}
