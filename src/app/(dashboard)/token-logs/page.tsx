"use client";

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { format } from "date-fns";

type TokenLogRow = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
};

const TYPE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  balance_init:      { label: "계정 생성", variant: "outline" },
  monthly_grant:     { label: "월 지급", variant: "default" },
  signup_bonus:      { label: "가입 보너스", variant: "default" },
  attendance:        { label: "출석 체크", variant: "default" },
  referral_inviter:  { label: "초대 보상(초대자)", variant: "default" },
  referral_invitee:  { label: "초대 보상(피초대자)", variant: "default" },
  chat_usage:        { label: "채팅 사용", variant: "secondary" },
  draft_usage:       { label: "초안 생성", variant: "secondary" },
  chat_refund:       { label: "환불", variant: "outline" },
  admin_grant:       { label: "운영자 지급", variant: "destructive" },
  admin_reset:       { label: "운영자 초기화", variant: "destructive" },
};

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_LABELS[type] ?? { label: type, variant: "outline" as const };
  return <Badge variant={config.variant} className="text-[10px] whitespace-nowrap">{config.label}</Badge>;
}

function AmountCell({ amount }: { amount: number }) {
  const positive = amount >= 0;
  return (
    <span className={`text-xs font-medium tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}>
      {positive ? "+" : ""}
      {new Intl.NumberFormat("ko-KR").format(amount)}
    </span>
  );
}

export default function TokenLogsPage() {
  return (
    <Suspense>
      <TokenLogsContent />
    </Suspense>
  );
}

function TokenLogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchParam = searchParams.get("search") ?? "";
  const [page, setPage] = useState(1);
  const [prevSearchParam, setPrevSearchParam] = useState(searchParam);
  const [searchInput, setSearchInput] = useState(searchParam);
  const [search, setSearch] = useState(searchParam);
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const userId = searchParams.get("userId") ?? "";

  if (searchParam !== prevSearchParam) {
    setPrevSearchParam(searchParam);
    setSearch(searchParam);
    setSearchInput(searchParam);
  }

  const { data, isLoading } = useQuery<{
    data: TokenLogRow[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ["token-logs", { page, search, type, userId }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      if (userId) params.set("userId", userId);
      const r = await fetch(`/api/token-logs?${params}`);
      if (!r.ok) throw new Error("Failed to fetch logs");
      return r.json();
    },
  });

  function clearUserFilter() {
    const url = new URL(window.location.href);
    url.searchParams.delete("userId");
    router.push(url.pathname + url.search);
  }

  const columns: ColumnDef<TokenLogRow>[] = [
    {
      accessorKey: "created_at",
      header: "시간",
      size: 130,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {format(new Date(row.original.created_at), "MM-dd HH:mm:ss")}
        </span>
      ),
    },
    {
      accessorKey: "user_email",
      header: "사용자",
      size: 200,
      cell: ({ row }) => (
        <div>
          <p className="text-xs font-medium">{row.original.user_name ?? "-"}</p>
          <p className="text-[11px] text-muted-foreground">{row.original.user_email ?? row.original.user_id}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "유형",
      size: 140,
      cell: ({ row }) => <TypeBadge type={row.original.type} />,
    },
    {
      accessorKey: "amount",
      header: "금액",
      size: 90,
      cell: ({ row }) => <AmountCell amount={row.original.amount} />,
    },
    {
      accessorKey: "description",
      header: "설명",
      size: 220,
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground line-clamp-2">
          {row.original.description ?? "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="토큰 지급/사용 로그" description="가입 보너스, 월 지급, 출석, 채팅/초안 사용 등 토큰 증감 이력" />

      {userId && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">유저 필터:</span>
          <span className="font-medium">{userId}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearUserFilter}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput);
            setPage(1);
          }}
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

        <Select value={type || "all"} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-[500px]" />
      ) : (
        <DataTable
          columns={columns}
          data={(data?.data ?? []) as unknown as TokenLogRow[]}
          manualPagination
          page={page}
          pageSize={30}
          pageCount={data?.totalPages ?? 1}
          totalCount={data?.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
