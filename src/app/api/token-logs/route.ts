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
    const type = searchParams.get("type") ?? "";
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
    if (type) {
      args.push(type);
      conditions.push(`tt.type = $${args.length}`);
    }
    if (userId) {
      args.push(userId);
      conditions.push(`tt.user_id = $${args.length}::uuid`);
    }
    if (dateFrom) {
      args.push(dateFrom);
      conditions.push(`tt.created_at >= $${args.length}::timestamptz`);
    }
    if (dateTo) {
      args.push(dateTo);
      conditions.push(`tt.created_at < ($${args.length}::timestamptz + INTERVAL '1 day')`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countResult, rows] = await Promise.all([
      prisma.$queryRawUnsafe<{ cnt: bigint }[]>(`
        SELECT COUNT(*) AS cnt
        FROM token_transactions tt
        LEFT JOIN users u ON u.id = tt.user_id
        ${where}
      `, ...args),
      prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
        SELECT
          tt.id, tt.user_id::text, tt.amount, tt.type, tt.description, tt.created_at,
          u.email AS user_email, u.full_name AS user_name
        FROM token_transactions tt
        LEFT JOIN users u ON u.id = tt.user_id
        ${where}
        ORDER BY tt.created_at DESC
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
    console.error("Token logs error:", error);
    return NextResponse.json({ error: "Failed to fetch token logs" }, { status: 500 });
  }
}
