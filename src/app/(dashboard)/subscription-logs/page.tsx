"use client";

import { useState, useEffect, Suspense } from "react";
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

type EventRow = {
  id: string;
  user_id: string;
  sub_type: string;
  event_type: string;
  plan: string | null;
  rebill_no: string | null;
  amount: number | null;
  notes: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
  sub_is_active: boolean | null;
  is_auto_renew: boolean | null;
  sub_expires_at: string | null;
};

const EVENT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  INITIATED:         { label: "결제 요청", variant: "outline" },
  ACTIVATED:         { label: "결제 완료", variant: "default" },
  CANCELLED:         { label: "구독 취소", variant: "secondary" },
  CANCEL_PAYAPP_OK:  { label: "PayApp 취소 성공", variant: "secondary" },
  CANCEL_PAYAPP_FAIL:{ label: "PayApp 취소 실패", variant: "destructive" },
  DEACTIVATED:       { label: "구독 비활성화", variant: "destructive" },
  REFUNDED:          { label: "환불", variant: "destructive" },
  RENEWED:           { label: "자동 갱신", variant: "default" },
};

function EventBadge({ type }: { type: string }) {
  const config = EVENT_LABELS[type] ?? { label: type, variant: "outline" as const };
  return <Badge variant={config.variant} className="text-[10px] whitespace-nowrap">{config.label}</Badge>;
}

function SubStatusBadge({ row }: { row: EventRow }) {
  if (row.sub_is_active === null) return <span className="text-muted-foreground text-xs">-</span>;
  if (row.sub_is_active) {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge variant="default" className="text-[10px] w-fit">활성</Badge>
        {!row.is_auto_renew && <span className="text-[10px] text-muted-foreground">취소 예약</span>}
        {row.sub_expires_at && (
          <span className="text-[10px] text-muted-foreground">
            ~{format(new Date(row.sub_expires_at), "MM/dd")}
          </span>
        )}
      </div>
    );
  }
  return <Badge variant="secondary" className="text-[10px]">비활성</Badge>;
}

export default function SubscriptionLogsPage() {
  return (
    <Suspense>
      <SubscriptionLogsContent />
    </Suspense>
  );
}

function SubscriptionLogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [eventType, setEventType] = useState(searchParams.get("eventType") ?? "");
  const [subType, setSubType] = useState(searchParams.get("subType") ?? "");
  const userId = searchParams.get("userId") ?? "";

  useEffect(() => {
    const s = searchParams.get("search") ?? "";
    setSearch(s);
    setSearchInput(s);
  }, [searchParams]);

  const { data, isLoading } = useQuery<{
    data: EventRow[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ["subscription-logs", { page, search, eventType, subType, userId }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (search) params.set("search", search);
      if (eventType) params.set("eventType", eventType);
      if (subType) params.set("subType", subType);
      if (userId) params.set("userId", userId);
      const r = await fetch(`/api/subscription-logs?${params}`);
      if (!r.ok) throw new Error("Failed to fetch logs");
      return r.json();
    },
  });

  function clearUserFilter() {
    const url = new URL(window.location.href);
    url.searchParams.delete("userId");
    router.push(url.pathname + url.search);
  }

  const columns: ColumnDef<EventRow>[] = [
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
      accessorKey: "sub_type",
      header: "구독",
      size: 70,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {row.original.sub_type.toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "event_type",
      header: "이벤트",
      size: 140,
      cell: ({ row }) => <EventBadge type={row.original.event_type} />,
    },
    {
      accessorKey: "plan",
      header: "플랜",
      size: 70,
      cell: ({ row }) => (
        <span className="text-xs capitalize">{row.original.plan ?? "-"}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: "금액",
      size: 90,
      cell: ({ row }) =>
        row.original.amount != null ? (
          <span className="text-xs font-medium">
            {new Intl.NumberFormat("ko-KR").format(row.original.amount)}원
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        ),
    },
    {
      id: "sub_status",
      header: "현재 구독 상태",
      size: 110,
      cell: ({ row }) => <SubStatusBadge row={row.original} />,
    },
    {
      accessorKey: "notes",
      header: "노트",
      size: 220,
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground line-clamp-2">
          {row.original.notes ?? "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="구독 이벤트 로그" description="결제 요청, 완료, 취소, 환불 이력" />

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

        <Select value={eventType || "all"} onValueChange={(v) => { setEventType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="이벤트 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 이벤트</SelectItem>
            <SelectItem value="INITIATED">결제 요청</SelectItem>
            <SelectItem value="ACTIVATED">결제 완료</SelectItem>
            <SelectItem value="CANCELLED">구독 취소</SelectItem>
            <SelectItem value="REFUNDED">환불</SelectItem>
            <SelectItem value="DEACTIVATED">구독 비활성화</SelectItem>
            <SelectItem value="CANCEL_PAYAPP_FAIL">PayApp 취소 실패</SelectItem>
            <SelectItem value="RENEWED">자동 갱신</SelectItem>
          </SelectContent>
        </Select>

        <Select value={subType || "all"} onValueChange={(v) => { setSubType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="구독 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="logit">Logit</SelectItem>
            <SelectItem value="mcp">MCP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-[500px]" />
      ) : (
        <DataTable
          columns={columns}
          data={(data?.data ?? []) as unknown as EventRow[]}
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
