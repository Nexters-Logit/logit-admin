import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function GET() {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);

    const [monthlyRaw, summaryRaw] = await Promise.all([
      // 최근 12개월 월별 결제완료/환불 분리
      prisma.$queryRawUnsafe<{
        month: string;
        revenue: bigint;
        count: bigint;
        refund_amount: bigint;
        refund_count: bigint;
      }[]>(`
        SELECT
          TO_CHAR(paid_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN pay_state = 4 THEN amount END), 0) AS revenue,
          COUNT(CASE WHEN pay_state = 4 THEN 1 END) AS count,
          COALESCE(SUM(CASE WHEN pay_state IN (9, 64) THEN amount END), 0) AS refund_amount,
          COUNT(CASE WHEN pay_state IN (9, 64) THEN 1 END) AS refund_count
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
        total_refund_amount: bigint;
        total_refund_count: bigint;
        this_month_revenue: bigint;
        this_month_payments: bigint;
        this_month_refund_amount: bigint;
        this_month_refund_count: bigint;
        active_logit_subs: bigint;
        active_mcp_subs: bigint;
      }[]>(`
        SELECT
          (SELECT COALESCE(SUM(amount), 0) FROM payment_records WHERE pay_state = 4) AS total_revenue,
          (SELECT COUNT(*) FROM payment_records WHERE pay_state = 4) AS total_payments,
          (SELECT COALESCE(SUM(amount), 0) FROM payment_records WHERE pay_state IN (9, 64)) AS total_refund_amount,
          (SELECT COUNT(*) FROM payment_records WHERE pay_state IN (9, 64)) AS total_refund_count,
          (SELECT COALESCE(SUM(amount), 0) FROM payment_records
           WHERE pay_state = 4 AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())) AS this_month_revenue,
          (SELECT COUNT(*) FROM payment_records
           WHERE pay_state = 4 AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())) AS this_month_payments,
          (SELECT COALESCE(SUM(amount), 0) FROM payment_records
           WHERE pay_state IN (9, 64) AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())) AS this_month_refund_amount,
          (SELECT COUNT(*) FROM payment_records
           WHERE pay_state IN (9, 64) AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())) AS this_month_refund_count,
          (SELECT COUNT(*) FROM subscriptions WHERE type = 'logit' AND is_active = true) AS active_logit_subs,
          (SELECT COUNT(*) FROM subscriptions WHERE type = 'mcp' AND is_active = true) AS active_mcp_subs
      `),
    ]);

    // 12개월 빈 슬롯 채우기
    const monthlyMap: Record<string, { revenue: number; count: number; refund_amount: number; refund_count: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = { revenue: 0, count: 0, refund_amount: 0, refund_count: 0 };
    }
    for (const row of monthlyRaw) {
      if (monthlyMap[row.month] !== undefined) {
        monthlyMap[row.month] = {
          revenue: Number(row.revenue),
          count: Number(row.count),
          refund_amount: Number(row.refund_amount),
          refund_count: Number(row.refund_count),
        };
      }
    }
    const monthly = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }));

    const s = summaryRaw[0];
    return NextResponse.json({
      monthly,
      total_revenue: Number(s?.total_revenue ?? 0),
      total_payments: Number(s?.total_payments ?? 0),
      total_refund_amount: Number(s?.total_refund_amount ?? 0),
      total_refund_count: Number(s?.total_refund_count ?? 0),
      this_month_revenue: Number(s?.this_month_revenue ?? 0),
      this_month_payments: Number(s?.this_month_payments ?? 0),
      this_month_refund_amount: Number(s?.this_month_refund_amount ?? 0),
      this_month_refund_count: Number(s?.this_month_refund_count ?? 0),
      active_logit_subs: Number(s?.active_logit_subs ?? 0),
      active_mcp_subs: Number(s?.active_mcp_subs ?? 0),
    });
  } catch (error) {
    console.error("Payment stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
