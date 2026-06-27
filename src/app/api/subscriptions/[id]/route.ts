import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const { id } = await params;
    const { is_active, is_auto_renew, plan, expires_at } = await req.json();

    const sets: string[] = [];
    const args: unknown[] = [];

    if (is_active !== undefined) { args.push(is_active); sets.push(`is_active = $${args.length}`); }
    if (is_auto_renew !== undefined) { args.push(is_auto_renew); sets.push(`is_auto_renew = $${args.length}`); }
    if (plan !== undefined) { args.push(plan); sets.push(`plan = $${args.length}::subscriptionplan`); }
    if (expires_at !== undefined) { args.push(expires_at); sets.push(`expires_at = $${args.length}::timestamptz`); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(id);
    await prisma.$queryRawUnsafe(
      `UPDATE subscriptions SET ${sets.join(", ")} WHERE id = $${args.length}::uuid`,
      ...args
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription update error:", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const { id } = await params;

    // subscription의 user_id와 type 조회
    const rows = await prisma.$queryRawUnsafe<{ user_id: string; type: string }[]>(
      `SELECT user_id::text, type::text FROM subscriptions WHERE id = $1::uuid`,
      id
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const { user_id, type: sub_type } = rows[0];

    // BE 내부 엔드포인트 호출 — PayApp 취소 + DB 비활성화
    const beUrl = process.env.BE_INTERNAL_URL ?? "http://localhost:8000";
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      console.error("ADMIN_SECRET이 설정되지 않아 BE 내부 엔드포인트를 호출할 수 없습니다.");
      return NextResponse.json({ error: "Server misconfiguration: ADMIN_SECRET not set" }, { status: 500 });
    }

    const beRes = await fetch(
      `${beUrl}/api/v1/payments/internal/subscriptions/${user_id}/${sub_type}`,
      {
        method: "DELETE",
        headers: { "X-Admin-Secret": adminSecret },
      }
    );

    if (!beRes.ok) {
      const text = await beRes.text();
      console.error(`BE 내부 엔드포인트 오류: ${beRes.status} ${text}`);
      return NextResponse.json(
        { error: `BE 오류 (${beRes.status}): ${text}` },
        { status: beRes.status >= 500 ? 502 : beRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription delete error:", error);
    return NextResponse.json({ error: "Failed to deactivate subscription" }, { status: 500 });
  }
}
