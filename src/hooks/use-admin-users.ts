import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AdminUser {
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin-users");
      if (!res.ok) throw new Error("Failed to fetch admin users");
      return res.json();
    },
  });
}

export function useUpdateAdminUserName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, name }: { email: string; name: string }) => {
      const res = await fetch(`/api/admin-users/${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update admin user");
      return res.json() as Promise<AdminUser>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}
