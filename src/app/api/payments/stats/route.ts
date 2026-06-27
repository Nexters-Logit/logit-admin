import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function GET() {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);

    const [monthlyRaw, summaryRaw] = await Promise.all([
      // 최근 12개월 월별 매출 및 결제 수
      prisma.$queryRawUnsafe<{ month: string; revenue: bigint; count: bigint }[]>(`
        SELECT
          TO_CHAR(paid_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM') AS month,
          SUM(amount) AS revenue,
          COUNT(*) AS count
        FROM payment_records
        WHERE paid_at IS NOT NULL
          AND paid_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
        GROUP BY month
        ORDER BY month ASC
      `),
      // 요약 통계
      prisma.$queryRawUnsafe<{
        total_revenue: bigint;
        total_payments: bigint;
        this_month_revenue: bigint;
        this_month_payments: bigint;
        active_logit_subs: bigint;
        active_mcp_subs: bigint;
      }[]>(`
        SELECT
          (SELECT COALESCE(SUM(amount), 0) FROM payment_records WHERE paid_at IS NOT NULL) AS total_revenue,
          (SELECT COUNT(*) FROM payment_records WHERE paid_at IS NOT NULL) AS total_payments,
          (SELECT COALESCE(SUM(amount), 0) FROM payment_records
           WHERE paid_at IS NOT NULL
             AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())) AS this_month_revenue,
          (SELECT COUNT(*) FROM payment_records
           WHERE paid_at IS NOT NULL
             AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())) AS this_month_payments,
          (SELECT COUNT(*) FROM subscriptions WHERE type = 'logit' AND is_active = true) AS active_logit_subs,
          (SELECT COUNT(*) FROM subscriptions WHERE type = 'mcp' AND is_active = true) AS active_mcp_subs
      `),
    ]);

    // 12개월 빈 슬롯 채우기
    const monthlyMap: Record<string, { revenue: number; count: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = { revenue: 0, count: 0 };
    }
    for (const row of monthlyRaw) {
      if (monthlyMap[row.month] !== undefined) {
        monthlyMap[row.month] = {
          revenue: Number(row.revenue),
          count: Number(row.count),
        };
      }
    }
    const monthly = Object.entries(monthlyMap).map(([month, { revenue, count }]) => ({
      month,
      revenue,
      count,
    }));

    const s = summaryRaw[0];
    return NextResponse.json({
      monthly,
      total_revenue: Number(s?.total_revenue ?? 0),
      total_payments: Number(s?.total_payments ?? 0),
      this_month_revenue: Number(s?.this_month_revenue ?? 0),
      this_month_payments: Number(s?.this_month_payments ?? 0),
      active_logit_subs: Number(s?.active_logit_subs ?? 0),
      active_mcp_subs: Number(s?.active_mcp_subs ?? 0),
    });
  } catch (error) {
    console.error("Payment stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
