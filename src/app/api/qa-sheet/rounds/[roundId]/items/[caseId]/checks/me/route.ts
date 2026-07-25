import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminEmail } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { assertRoundOpen, getRoundOr404, validateResultStatus } from "@/lib/qa";
import { upsertMyCheck } from "@/lib/qa-checks";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string; caseId: string }> }
) {
  try {
    const { roundId, caseId } = await params;
    const body = await req.json();
    const actorEmail = await getCurrentAdminEmail();

    if (!actorEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const statusError = validateResultStatus(body.status);
    if (statusError) return NextResponse.json({ error: statusError }, { status: 400 });

    const nextStatus = body.status === undefined ? undefined : body.status;
    if (nextStatus === "fail" || nextStatus === "blocked") {
      if (!body.device?.trim() || !body.situation?.trim() || !body.detail?.trim()) {
        return NextResponse.json(
          { error: "Fail/보류는 디바이스, 발생 상황, 상세 내용을 입력해야 저장할 수 있습니다." },
          { status: 400 }
        );
      }
      if (!body.screenshot_url?.trim()) {
        return NextResponse.json(
          { error: "Fail/보류는 스크린샷을 업로드해야 저장할 수 있습니다." },
          { status: 400 }
        );
      }
    }

    const prisma = getPrisma("production");
    const { round, error } = await getRoundOr404(prisma, roundId);
    if (error) return error;
    const blocked = assertRoundOpen(round);
    if (blocked) return blocked;

    const item = await prisma.qaRoundItem.findUnique({
      where: { round_id_case_id: { round_id: roundId, case_id: caseId } },
      select: { case_id: true },
    });
    if (!item) {
      return NextResponse.json({ error: "존재하지 않는 라운드 항목입니다." }, { status: 404 });
    }

    const updated = await upsertMyCheck(prisma, {
      roundId,
      caseId,
      testerEmail: actorEmail,
      status: nextStatus,
      device: body.device,
      situation: body.situation,
      screenshotUrl: body.screenshot_url,
      detail: body.detail,
      confirmed: body.confirmed,
      updatedBy: actorEmail,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("QA round item check update error:", error);
    return NextResponse.json({ error: "Failed to update QA check" }, { status: 500 });
  }
}
