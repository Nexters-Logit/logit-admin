"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { ColumnDef } from "@tanstack/react-table";
import { Search, ExternalLink, TrendingUp, CreditCard, Users, DollarSign, RotateCcw, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type PaymentRow = {
  id: string;
  user_id: string;
  subscription_type: string;
  plan: string;
  amount: number;
  pay_state: number | null;
  paid_at: string | null;
  card_name: string | null;
  card_number: string | null;
  receipt_url: string | null;
  user_email: string | null;
  user_name: string | null;
};

type StatsData = {
  monthly: { month: string; revenue: number; count: number; refund_amount: number; refund_count: number }[];
  total_revenue: number;
  total_payments: number;
  total_refund_amount: number;
  total_refund_count: number;
  this_month_revenue: number;
  this_month_payments: number;
  this_month_refund_amount: number;
  this_month_refund_count: number;
  active_logit_subs: number;
  active_mcp_subs: number;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PayStateBadge({ state }: { state: number | null }) {
  if (state === 4) return <Badge className="text-[10px]">완료</Badge>;
  if (state === 9 || state === 64) return <Badge variant="destructive" className="text-[10px]">환불</Badge>;
  if (state === 8 || state === 32) return <Badge variant="secondary" className="text-[10px]">취소</Badge>;
  return <Badge variant="outline" className="text-[10px]">{state ?? "-"}</Badge>;
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [subType, setSubType] = useState("");
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["payment-stats"],
    queryFn: async () => {
      const r = await fetch("/api/payments/stats");
      if (!r.ok) throw new Error("Failed to fetch stats");
      return r.json();
    },
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<{
    data: PaymentRow[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ["payments", { page, search, subType }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (subType) params.set("subType", subType);
      const r = await fetch(`/api/payments?${params}`);
      if (!r.ok) throw new Error("Failed to fetch payments");
      return r.json();
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/payments/${id}/refund`, { method: "POST" });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? "환불 실패");
      }
    },
    onSuccess: () => {
      toast.success("환불이 완료되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-logs"] });
      setRefundTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: ColumnDef<PaymentRow>[] = [
    {
      accessorKey: "user_email",
      header: "사용자",
      size: 200,
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.user_name ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{row.original.user_email ?? row.original.user_id}</p>
        </div>
      ),
    },
    {
      accessorKey: "subscription_type",
      header: "구독",
      size: 80,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {row.original.subscription_type.toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "plan",
      header: "플랜",
      size: 70,
      cell: ({ row }) => (
        <span className="text-xs font-medium capitalize">{row.original.plan}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: "금액",
      size: 100,
      cell: ({ row }) => (
        <span className="font-semibold">{formatPrice(row.original.amount)}원</span>
      ),
    },
    {
      accessorKey: "pay_state",
      header: "상태",
      size: 80,
      cell: ({ row }) => <PayStateBadge state={row.original.pay_state} />,
    },
    {
      accessorKey: "paid_at",
      header: "결제일",
      size: 130,
      cell: ({ row }) =>
        row.original.paid_at
          ? format(new Date(row.original.paid_at), "yyyy-MM-dd HH:mm")
          : "-",
    },
    {
      accessorKey: "card_name",
      header: "결제수단",
      size: 140,
      cell: ({ row }) => {
        const { card_name, card_number } = row.original;
        if (!card_name) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="text-xs">
            {card_name}{card_number ? ` ${card_number}` : ""}
          </span>
        );
      },
    },
    {
      id: "receipt",
      header: "영수증",
      size: 60,
      cell: ({ row }) =>
        row.original.receipt_url ? (
          <a
            href={row.original.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            보기 <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "actions",
      size: 50,
      cell: ({ row }) => {
        if (row.original.pay_state !== 4) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setRefundTarget(row.original)}
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                환불 처리
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const chartData = stats?.monthly.map((m) => ({ ...m, label: m.month.slice(5) })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="결제 관리" description="결제 내역 및 매출 통계" />

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="이번 달 매출"
            value={`${formatPrice(stats?.this_month_revenue ?? 0)}원`}
            sub={`${stats?.this_month_payments ?? 0}건`}
            icon={TrendingUp}
          />
          <StatCard
            title="이번 달 환불"
            value={`${formatPrice(stats?.this_month_refund_amount ?? 0)}원`}
            sub={`${stats?.this_month_refund_count ?? 0}건`}
            icon={RotateCcw}
            className="border-destructive/30"
          />
          <StatCard
            title="이번 달 순매출"
            value={`${formatPrice((stats?.this_month_revenue ?? 0) - (stats?.this_month_refund_amount ?? 0))}원`}
            sub="매출 - 환불"
            icon={DollarSign}
          />
          <StatCard
            title="전체 누적 매출"
            value={`${formatPrice(stats?.total_revenue ?? 0)}원`}
            sub={`총 ${stats?.total_payments ?? 0}건`}
            icon={DollarSign}
          />
          <StatCard
            title="Logit 활성 구독"
            value={String(stats?.active_logit_subs ?? 0)}
            sub="현재 활성"
            icon={CreditCard}
          />
          <StatCard
            title="MCP 활성 구독"
            value={String(stats?.active_mcp_subs ?? 0)}
            sub="현재 활성"
            icon={Users}
          />
        </div>
      )}

      {/* Monthly Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">월별 매출 / 환불 (최근 12개월)</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <ChartContainer
              config={{
                revenue: { label: "매출", color: "hsl(var(--primary))" },
                refund_amount: { label: "환불", color: "hsl(var(--destructive))" },
              }}
              className="h-48 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [
                          `${formatPrice(Number(value))}원`,
                          name === "revenue" ? "매출" : "환불",
                        ]}
                      />
                    }
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="refund_amount" fill="var(--color-refund_amount)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Filter */}
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
        <Select value={subType || "all"} onValueChange={(v) => { setSubType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="구독 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="logit">Logit</SelectItem>
            <SelectItem value="mcp">MCP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {paymentsLoading ? (
        <Skeleton className="h-[400px]" />
      ) : (
        <DataTable
          columns={columns}
          data={(payments?.data ?? []) as unknown as PaymentRow[]}
          manualPagination
          page={page}
          pageSize={20}
          pageCount={payments?.totalPages ?? 1}
          totalCount={payments?.total}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={refundTarget !== null}
        onOpenChange={(open) => { if (!open) setRefundTarget(null); }}
        title="환불 처리"
        description={
          refundTarget
            ? `${refundTarget.user_email ?? refundTarget.user_id}의 ${formatPrice(refundTarget.amount)}원 결제를 환불하시겠습니까? 구독은 만료일까지 유지됩니다.`
            : ""
        }
        confirmLabel="환불"
        variant="destructive"
        onConfirm={() => refundTarget && refundMutation.mutate(refundTarget.id)}
        loading={refundMutation.isPending}
      />
    </div>
  );
}
