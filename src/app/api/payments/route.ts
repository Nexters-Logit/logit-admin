import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const { searchParams } = req.nextUrl;

    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const subType = searchParams.get("subType") ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ["pr.paid_at IS NOT NULL"];
    const args: unknown[] = [];

    if (search) {
      args.push(`%${search}%`);
      conditions.push(`u.email ILIKE $${args.length}`);
    }
    if (subType) {
      args.push(subType);
      conditions.push(`pr.subscription_type = $${args.length}`);
    }
    if (dateFrom) {
      args.push(dateFrom);
      conditions.push(`pr.paid_at >= $${args.length}::timestamptz`);
    }
    if (dateTo) {
      args.push(dateTo);
      conditions.push(`pr.paid_at < ($${args.length}::timestamptz + INTERVAL '1 day')`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) AS cnt
      FROM payment_records pr
      LEFT JOIN users u ON u.id = pr.user_id
      ${where}
    `;

    const dataQuery = `
      SELECT
        pr.id, pr.user_id, pr.subscription_type, pr.plan,
        pr.amount, pr.pay_state, pr.paid_at,
        pr.card_name, pr.card_number, pr.receipt_url,
        pr.subscription_started_at, pr.subscription_expires_at,
        u.email AS user_email, u.full_name AS user_name
      FROM payment_records pr
      LEFT JOIN users u ON u.id = pr.user_id
      ${where}
      ORDER BY pr.paid_at DESC
      LIMIT $${args.length + 1} OFFSET $${args.length + 2}
    `;

    const [countResult, rows] = await Promise.all([
      prisma.$queryRawUnsafe<{ cnt: bigint }[]>(countQuery, ...args),
      prisma.$queryRawUnsafe<Record<string, unknown>[]>(dataQuery, ...args, pageSize, offset),
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
    console.error("Payments fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
