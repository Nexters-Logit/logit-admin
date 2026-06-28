"use client";

import { useAIUsage } from "@/hooks/use-ai-usage";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Zap, ArrowUp, ArrowDown, Hash } from "lucide-react";

const ENDPOINT_LABEL: Record<string, string> = {
  chat: "채팅",
  draft: "초안",
  classification: "분류",
  embedding: "임베딩",
};

const PLAN_LABEL: Record<string, string> = {
  lite: "Lite",
  pro: "Pro",
  basic: "Basic",
  free: "Free",
  mcp: "MCP",
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function AIUsagePage() {
  const { data, isLoading, isError } = useAIUsage();

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI 토큰 사용량" />
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          데이터를 불러오지 못했습니다. ai_usage_logs 테이블을 확인해 주세요.
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI 토큰 사용량" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px]" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  const totalToday = data.today.input + data.today.output;
  const total30 = data.thirtyDays.input + data.thirtyDays.output;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 토큰 사용량"
        description="엔드포인트별 · 플랜별 AI 토큰 소비 현황"
      />

      {/* 요약 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="오늘 총 토큰"
          value={totalToday.toLocaleString()}
          icon={Zap}
          description={`${data.today.calls.toLocaleString()}회 호출`}
        />
        <StatCard
          title="오늘 입력 토큰"
          value={data.today.input.toLocaleString()}
          icon={ArrowUp}
        />
        <StatCard
          title="오늘 출력 토큰"
          value={data.today.output.toLocaleString()}
          icon={ArrowDown}
        />
        <StatCard
          title="30일 총 토큰"
          value={total30.toLocaleString()}
          icon={Hash}
          description={`${data.thirtyDays.calls.toLocaleString()}회 호출`}
        />
      </div>

      {/* 차트 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 일별 토큰 추이 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">일별 토큰 사용량 (30일)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                input: { label: "입력", color: "var(--chart-1)" },
                output: { label: "출력", color: "var(--chart-2)" },
              }}
              className="h-[260px] w-full"
            >
              <AreaChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} />
                <YAxis fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="input" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.2} stackId="1" />
                <Area type="monotone" dataKey="output" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.2} stackId="1" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 엔드포인트별 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">엔드포인트별 호출 수 (30일)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ calls: { label: "호출 수", color: "var(--chart-3)" } }}
              className="h-[250px] w-full"
            >
              <BarChart data={data.byEndpoint} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="endpoint"
                  fontSize={11}
                  tickFormatter={(v) => ENDPOINT_LABEL[v] ?? v}
                  width={70}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="calls" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 엔드포인트별 토큰 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">엔드포인트별 토큰 (30일)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                input: { label: "입력", color: "var(--chart-1)" },
                output: { label: "출력", color: "var(--chart-2)" },
              }}
              className="h-[250px] w-full"
            >
              <BarChart data={data.byEndpoint} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="endpoint"
                  fontSize={11}
                  tickFormatter={(v) => ENDPOINT_LABEL[v] ?? v}
                  width={70}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="input" fill="var(--chart-1)" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="output" fill="var(--chart-2)" radius={[0, 4, 4, 0]} stackId="a" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 플랜별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">플랜별 호출 분포 (30일)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer
              config={{ calls: { label: "호출 수" } }}
              className="h-[250px] w-full max-w-[300px]"
            >
              <PieChart>
                <Pie
                  data={data.byPlan}
                  dataKey="calls"
                  nameKey="plan"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ plan, percent }) =>
                    `${PLAN_LABEL[plan] ?? plan} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  fontSize={11}
                >
                  {data.byPlan.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 구독 유형별 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">구독 유형별 토큰 (30일)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                input: { label: "입력", color: "var(--chart-1)" },
                output: { label: "출력", color: "var(--chart-2)" },
              }}
              className="h-[250px] w-full"
            >
              <BarChart data={data.bySubType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" fontSize={11} />
                <YAxis fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="input" fill="var(--chart-1)" stackId="a" />
                <Bar dataKey="output" fill="var(--chart-2)" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
