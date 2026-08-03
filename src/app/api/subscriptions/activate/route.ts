import { NextRequest, NextResponse } from "next/server";
import { getServerEnv, getBeUrl } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const { user_id, type, plan, rebill_no, mul_no, amount, notes } = await req.json();

    if (!user_id || !type || !plan) {
      return NextResponse.json({ error: "user_id, type, plan은 필수입니다." }, { status: 400 });
    }

    // 결제 이력에 남길 정보를 그대로 BE에 전달 — user_id/type은 구독이 아예
    // 없는 상태(웹훅이 한 번도 안 온 경우)도 구제할 수 있어야 해서 기존
    // subscriptions row 조회 없이 직접 받는다.
    // BE 주소는 현재 화면의 dev/production 토글을 그대로 따라간다 — 안 그러면
    // "production" 화면에서 유저를 구제했는데 실제로는 dev 백엔드가 처리하는
    // 불일치가 생긴다.
    const beUrl = getBeUrl(await getServerEnv());
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      console.error("ADMIN_SECRET이 설정되지 않아 BE 내부 엔드포인트를 호출할 수 없습니다.");
      return NextResponse.json({ error: "Server misconfiguration: ADMIN_SECRET not set" }, { status: 500 });
    }

    const beRes = await fetch(
      `${beUrl}/api/v1/payments/internal/subscriptions/${user_id}/${type}/activate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Secret": adminSecret },
        body: JSON.stringify({ plan, rebill_no, mul_no, amount, notes }),
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
    console.error("Subscription activate error:", error);
    return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
  }
}
