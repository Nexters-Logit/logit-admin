import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const { searchParams } = req.nextUrl;

    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") ?? "30"));
    const search = searchParams.get("search") ?? "";
    const eventType = searchParams.get("eventType") ?? "";
    const subType = searchParams.get("subType") ?? "";
    const userId = searchParams.get("userId") ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const args: unknown[] = [];

    if (search) {
      args.push(`%${search}%`);
      conditions.push(`u.email ILIKE $${args.length}`);
    }
    if (eventType) {
      args.push(eventType);
      conditions.push(`se.event_type = $${args.length}`);
    }
    if (subType) {
      args.push(subType);
      conditions.push(`se.sub_type = $${args.length}`);
    }
    if (userId) {
      args.push(userId);
      conditions.push(`se.user_id = $${args.length}::uuid`);
    }
    if (dateFrom) {
      args.push(dateFrom);
      conditions.push(`se.created_at >= $${args.length}::timestamptz`);
    }
    if (dateTo) {
      args.push(dateTo);
      conditions.push(`se.created_at < ($${args.length}::timestamptz + INTERVAL '1 day')`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countResult, rows] = await Promise.all([
      prisma.$queryRawUnsafe<{ cnt: bigint }[]>(`
        SELECT COUNT(*) AS cnt
        FROM subscription_events se
        LEFT JOIN users u ON u.id = se.user_id
        ${where}
      `, ...args),
      prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
        SELECT
          se.id, se.user_id::text, se.sub_type, se.event_type,
          se.plan, se.rebill_no, se.amount, se.notes, se.created_at,
          u.email AS user_email, u.full_name AS user_name,
          s.is_active AS sub_is_active, s.is_auto_renew, s.expires_at AS sub_expires_at
        FROM subscription_events se
        LEFT JOIN users u ON u.id = se.user_id
        LEFT JOIN subscriptions s ON s.user_id = se.user_id AND s.type::text = se.sub_type
        ${where}
        ORDER BY se.created_at DESC
        LIMIT $${args.length + 1} OFFSET $${args.length + 2}
      `, ...args, pageSize, offset),
    ]);

    const total = Number(countResult[0]?.cnt ?? 0);

    return NextResponse.json({
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Subscription logs error:", error);
    return NextResponse.json({ error: "Failed to fetch subscription logs" }, { status: 500 });
  }
}
