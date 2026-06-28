import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma(await getServerEnv());
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    const conditions: string[] = [];
    const args: unknown[] = [];

    if (search) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search);
      if (isUuid) {
        args.push(search);
        conditions.push(`u.id = $${args.length}::uuid`);
      } else {
        args.push(`%${search}%`);
        conditions.push(`(u.email ILIKE $${args.length} OR u.full_name ILIKE $${args.length})`);
      }
    }
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      args.push(isActive === "true");
      conditions.push(`u.is_active = $${args.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countResult, rows] = await Promise.all([
      prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
        `SELECT COUNT(*) AS cnt FROM users u ${where}`,
        ...args
      ),
      prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
        SELECT
          u.id::text, u.email, u.full_name, u.profile_image_url,
          u.oauth_provider, u.is_active, u.created_at,
          (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id) AS project_count,
          (SELECT COUNT(*) FROM chats c WHERE c.user_id = u.id) AS chat_count,
          -- 구독 상태 요약
          (SELECT json_agg(json_build_object(
            'type', s.type,
            'plan', s.plan,
            'is_active', s.is_active,
            'is_auto_renew', s.is_auto_renew,
            'expires_at', s.expires_at
          )) FROM subscriptions s WHERE s.user_id = u.id AND s.is_active = true) AS active_subscriptions
        FROM users u
        ${where}
        ORDER BY u.created_at DESC
        LIMIT $${args.length + 1} OFFSET $${args.length + 2}
      `, ...args, pageSize, (page - 1) * pageSize),
    ]);

    const total = Number(countResult[0]?.cnt ?? 0);
    const data = rows.map((r) => ({
      ...r,
      _count: {
        projects: Number(r.project_count ?? 0),
        chats: Number(r.chat_count ?? 0),
      },
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Users list error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
