import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";
import { subDays, startOfDay, format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);

    const now = new Date();
    const todayStart = startOfDay(now);
    const thirtyDaysAgo = subDays(now, 30);

    const [todayLogs, allLogs, endpointRaw, planRaw, subTypeRaw] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where: { created_at: { gte: todayStart } },
        select: { input_tokens: true, output_tokens: true },
      }),
      prisma.aIUsageLog.findMany({
        where: { created_at: { gte: thirtyDaysAgo } },
        select: { input_tokens: true, output_tokens: true, created_at: true, endpoint: true },
        orderBy: { created_at: "asc" },
      }),
      prisma.aIUsageLog.groupBy({
        by: ["endpoint"],
        where: { created_at: { gte: thirtyDaysAgo } },
        _sum: { input_tokens: true, output_tokens: true },
        _count: { id: true },
      }),
      prisma.aIUsageLog.groupBy({
        by: ["plan"],
        where: { created_at: { gte: thirtyDaysAgo } },
        _sum: { input_tokens: true, output_tokens: true },
        _count: { id: true },
      }),
      prisma.aIUsageLog.groupBy({
        by: ["subscription_type"],
        where: { created_at: { gte: thirtyDaysAgo } },
        _sum: { input_tokens: true, output_tokens: true },
        _count: { id: true },
      }),
    ]);

    const sum = (logs: { input_tokens: number | null; output_tokens: number | null }[]) => ({
      input: logs.reduce((s, l) => s + (l.input_tokens ?? 0), 0),
      output: logs.reduce((s, l) => s + (l.output_tokens ?? 0), 0),
    });

    const todaySum = sum(todayLogs);

    // Daily breakdown for the last 30 days
    const dailyMap: Record<string, { input: number; output: number; calls: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(now, i), "yyyy-MM-dd");
      dailyMap[d] = { input: 0, output: 0, calls: 0 };
    }
    for (const log of allLogs) {
      const d = format(log.created_at, "yyyy-MM-dd");
      if (dailyMap[d]) {
        dailyMap[d].input += log.input_tokens ?? 0;
        dailyMap[d].output += log.output_tokens ?? 0;
        dailyMap[d].calls += 1;
      }
    }
    const daily = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));

    const thirtyDaySum = sum(allLogs);

    return NextResponse.json({
      today: { ...todaySum, calls: todayLogs.length },
      thirtyDays: { ...thirtyDaySum, calls: allLogs.length },
      daily,
      byEndpoint: endpointRaw.map((r) => ({
        endpoint: r.endpoint,
        input: r._sum.input_tokens ?? 0,
        output: r._sum.output_tokens ?? 0,
        calls: r._count.id,
      })),
      byPlan: planRaw.map((r) => ({
        plan: r.plan,
        input: r._sum.input_tokens ?? 0,
        output: r._sum.output_tokens ?? 0,
        calls: r._count.id,
      })),
      bySubType: subTypeRaw.map((r) => ({
        type: r.subscription_type,
        input: r._sum.input_tokens ?? 0,
        output: r._sum.output_tokens ?? 0,
        calls: r._count.id,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch AI usage" }, { status: 500 });
  }
}
