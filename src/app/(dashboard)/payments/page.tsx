"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Search, ExternalLink, TrendingUp, CreditCard, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";

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
  monthly: { month: string; revenue: number; count: number }[];
  total_revenue: number;
  total_payments: number;
  this_month_revenue: number;
  this_month_payments: number;
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
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
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

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [subType, setSubType] = useState("");

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

  const columns: ColumnDef<PaymentRow>[] = [
    {
      accessorKey: "user_email",
      header: "사용자",
      size: 220,
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.user_name ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{row.original.user_email ?? row.original.user_id}</p>
        </div>
      ),
    },
    {
      accessorKey: "subscription_type",
      header: "구독 타입",
      size: 100,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {row.original.subscription_type.toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "plan",
      header: "플랜",
      size: 80,
      cell: ({ row }) => (
        <span className="text-xs font-medium capitalize">{row.original.plan}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: "결제금액",
      size: 100,
      cell: ({ row }) => (
        <span className="font-semibold">{formatPrice(row.original.amount)}원</span>
      ),
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
            {card_name}
            {card_number ? ` ${card_number}` : ""}
          </span>
        );
      },
    },
    {
      id: "receipt",
      header: "영수증",
      size: 70,
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
  ];

  const chartData =
    stats?.monthly.map((m) => ({
      ...m,
      label: m.month.slice(5),
    })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="결제 관리" description="결제 내역 및 매출 통계" />

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="이번 달 매출"
            value={`${formatPrice(stats?.this_month_revenue ?? 0)}원`}
            sub={`${stats?.this_month_payments ?? 0}건`}
            icon={TrendingUp}
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
          <CardTitle className="text-sm font-medium">월별 매출 (최근 12개월)</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <ChartContainer
              config={{ revenue: { label: "매출", color: "hsl(var(--primary))" } }}
              className="h-48 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
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
                        formatter={(value) => [`${formatPrice(Number(value))}원`, "매출"]}
                      />
                    }
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
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
        <Select
          value={subType}
          onValueChange={(v) => {
            setSubType(v === "all" ? "" : v);
            setPage(1);
          }}
        >
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
    </div>
  );
}
