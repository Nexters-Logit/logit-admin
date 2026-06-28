import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const beUrl = process.env.BE_INTERNAL_URL ?? "http://localhost:8000";
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      return NextResponse.json({ error: "Server misconfiguration: ADMIN_SECRET not set" }, { status: 500 });
    }

    const beRes = await fetch(
      `${beUrl}/api/v1/payments/internal/payments/${id}/refund`,
      {
        method: "POST",
        headers: { "X-Admin-Secret": adminSecret },
      }
    );

    if (!beRes.ok) {
      const text = await beRes.text();
      console.error(`BE 환불 오류: ${beRes.status} ${text}`);
      return NextResponse.json(
        { error: `환불 실패 (${beRes.status}): ${text}` },
        { status: beRes.status >= 500 ? 502 : beRes.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
