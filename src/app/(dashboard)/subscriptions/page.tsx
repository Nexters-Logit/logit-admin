"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { Search, MoreHorizontal, Plus } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

const GRADIENT_COLORS = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-emerald-500 to-emerald-600",
  "from-rose-500 to-rose-600",
  "from-amber-500 to-amber-600",
  "from-sky-500 to-sky-600",
];

function getGradient(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length];
}

type SubRow = {
  id: string;
  user_id: string;
  type: string;
  is_active: boolean;
  is_auto_renew: boolean;
  plan: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
  profile_image_url: string | null;
};

function UserAvatar({ row }: { row: SubRow }) {
  const label = row.user_name ?? row.user_email ?? "?";
  const initial = label[0].toUpperCase();
  const gradient = getGradient(row.user_email ?? "");
  if (row.profile_image_url) {
    return (
      <Image
        src={row.profile_image_url}
        alt={label}
        width={28}
        height={28}
        className="rounded-full object-cover shrink-0"
        style={{ width: 28, height: 28 }}
      />
    );
  }
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-semibold text-white`}>
      {initial}
    </div>
  );
}

type AddForm = {
  user_id: string;
  type: string;
  plan: string;
  days: string;
};

const PLAN_OPTIONS: Record<string, string[]> = {
  logit: ["lite", "pro"],
  mcp: ["basic"],
};

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [subType, setSubType] = useState("");
  const [isActive, setIsActive] = useState("true");
  const [deactivateTarget, setDeactivateTarget] = useState<SubRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({ user_id: "", type: "logit", plan: "lite", days: "31" });

  const { data, isLoading } = useQuery<{ data: SubRow[]; total: number; totalPages: number }>({
    queryKey: ["subscriptions", { page, search, subType, isActive }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (subType) params.set("subType", subType);
      if (isActive) params.set("isActive", isActive);
      const r = await fetch(`/api/subscriptions?${params}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("구독을 비활성화했습니다.");
      setDeactivateTarget(null);
    },
    onError: () => toast.error("비활성화에 실패했습니다."),
  });

  const addSub = useMutation({
    mutationFn: async (body: object) => {
      const r = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("구독을 추가했습니다.");
      setAddOpen(false);
      setAddForm({ user_id: "", type: "logit", plan: "lite", days: "31" });
    },
    onError: (e) => toast.error(e.message),
  });

  const columns: ColumnDef<SubRow>[] = [
    {
      accessorKey: "user_email",
      header: "사용자",
      size: 260,
      cell: ({ row }) => (
        <Link href={`/users/${row.original.user_id}`} className="flex items-center gap-2.5 min-w-0">
          <UserAvatar row={row.original} />
          <div className="min-w-0">
            <p className="text-sm font-medium hover:text-primary transition-colors truncate">
              {row.original.user_name ?? "-"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {row.original.user_email ?? row.original.user_id}
            </p>
          </div>
        </Link>
      ),
    },
    {
      accessorKey: "type",
      header: "타입",
      size: 90,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px] uppercase">{row.original.type}</Badge>
      ),
    },
    {
      accessorKey: "plan",
      header: "플랜",
      size: 90,
      cell: ({ row }) => (
        <span className="text-xs font-medium capitalize">{row.original.plan}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "상태",
      size: 90,
      cell: ({ row }) => {
        const { is_active, is_auto_renew } = row.original;
        if (!is_active) return <Badge variant="secondary" className="text-[10px]">비활성</Badge>;
        if (!is_auto_renew) return <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">취소 예약</Badge>;
        return <Badge className="text-[10px]">활성</Badge>;
      },
    },
    {
      accessorKey: "started_at",
      header: "시작일",
      size: 110,
      cell: ({ row }) =>
        row.original.started_at
          ? format(new Date(row.original.started_at), "yyyy-MM-dd")
          : "-",
    },
    {
      accessorKey: "expires_at",
      header: "만료일",
      size: 110,
      cell: ({ row }) => {
        if (!row.original.expires_at) return <span className="text-muted-foreground">-</span>;
        const d = new Date(row.original.expires_at);
        const isExpiringSoon = d < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        return (
          <span className={isExpiringSoon && row.original.is_active ? "font-medium text-orange-600" : ""}>
            {format(d, "yyyy-MM-dd")}
          </span>
        );
      },
    },
    {
      id: "actions",
      size: 50,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/users/${row.original.user_id}`}>유저 상세</Link>
            </DropdownMenuItem>
            {row.original.is_active && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeactivateTarget(row.original)}
              >
                비활성화
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="구독 현황" description="유저별 구독 상태를 관리합니다.">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          구독 추가
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row">
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
          className="relative flex-1"
        >
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이메일로 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </form>
        <Select value={subType} onValueChange={(v) => { setSubType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="구독 타입" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="logit">Logit</SelectItem>
            <SelectItem value="mcp">MCP</SelectItem>
          </SelectContent>
        </Select>
        <Select value={isActive} onValueChange={(v) => { setIsActive(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="상태" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="true">활성</SelectItem>
            <SelectItem value="false">비활성</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px]" />
      ) : (
        <DataTable
          columns={columns}
          data={(data?.data ?? []) as unknown as SubRow[]}
          manualPagination
          page={page}
          pageSize={20}
          pageCount={data?.totalPages ?? 1}
          totalCount={data?.total}
          onPageChange={setPage}
        />
      )}

      {/* Add subscription dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>구독 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>유저 ID (UUID)</Label>
              <Input
                value={addForm.user_id}
                onChange={(e) => setAddForm({ ...addForm, user_id: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>구독 타입</Label>
                <Select
                  value={addForm.type}
                  onValueChange={(v) =>
                    setAddForm({ ...addForm, type: v, plan: PLAN_OPTIONS[v][0] })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="logit">Logit</SelectItem>
                    <SelectItem value="mcp">MCP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>플랜</Label>
                <Select
                  value={addForm.plan}
                  onValueChange={(v) => setAddForm({ ...addForm, plan: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(PLAN_OPTIONS[addForm.type] ?? []).map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>구독 기간 (일)</Label>
              <Input
                type="number"
                value={addForm.days}
                onChange={(e) => setAddForm({ ...addForm, days: e.target.value })}
                min="1"
                max="365"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
              <Button
                onClick={() =>
                  addSub.mutate({
                    user_id: addForm.user_id,
                    type: addForm.type,
                    plan: addForm.plan,
                    days: Number(addForm.days),
                  })
                }
                disabled={addSub.isPending || !addForm.user_id.trim()}
              >
                {addSub.isPending ? "추가 중..." : "추가"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={() => setDeactivateTarget(null)}
        title="구독 비활성화"
        description={`${deactivateTarget?.user_email ?? "이 유저"}의 ${deactivateTarget?.type?.toUpperCase()} 구독을 즉시 비활성화합니다. 되돌릴 수 없습니다.`}
        confirmLabel="비활성화"
        variant="destructive"
        loading={deactivate.isPending}
        onConfirm={() => {
          if (deactivateTarget) deactivate.mutate(deactivateTarget.id);
        }}
      />
    </div>
  );
}
