import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const { user_id, type, plan, days = 31 } = await req.json();

    if (!user_id || !type || !plan) {
      return NextResponse.json({ error: "user_id, type, plan은 필수입니다." }, { status: 400 });
    }

    await prisma.$queryRawUnsafe(
      `INSERT INTO subscriptions (id, user_id, type, is_active, is_auto_renew, plan, started_at, expires_at, created_at)
       VALUES (gen_random_uuid(), $1::uuid, $2, true, true, $3::subscriptionplan, NOW(), NOW() + ($4 || ' days')::INTERVAL, NOW())
       ON CONFLICT (user_id, type) DO UPDATE SET
         is_active = true, is_auto_renew = true, plan = $3::subscriptionplan,
         started_at = NOW(), expires_at = NOW() + ($4 || ' days')::INTERVAL`,
      user_id, type, plan, String(days)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription create error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const { searchParams } = req.nextUrl;

    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Number(searchParams.get("pageSize") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const subType = searchParams.get("subType") ?? "";
    const isActive = searchParams.get("isActive") ?? "";
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const args: unknown[] = [];

    if (search) {
      args.push(`%${search}%`);
      conditions.push(`u.email ILIKE $${args.length}`);
    }
    if (subType) {
      args.push(subType);
      conditions.push(`s.type = $${args.length}`);
    }
    if (isActive === "true") conditions.push("s.is_active = true");
    else if (isActive === "false") conditions.push("s.is_active = false");

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) AS cnt
      FROM subscriptions s
      LEFT JOIN users u ON u.id = s.user_id
      ${where}
    `;

    const dataQuery = `
      SELECT
        s.id, s.user_id, s.type, s.is_active, s.is_auto_renew, s.plan,
        s.started_at, s.expires_at, s.created_at,
        u.email AS user_email, u.full_name AS user_name, u.profile_image_url
      FROM subscriptions s
      LEFT JOIN users u ON u.id = s.user_id
      ${where}
      ORDER BY s.created_at DESC
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
    console.error("Subscriptions fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}
