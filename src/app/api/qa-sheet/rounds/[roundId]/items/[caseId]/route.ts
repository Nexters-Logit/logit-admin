import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getCurrentAdminEmail } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";
import { assertRoundOpen, getRoundOr404, validateResultStatus } from "@/lib/qa";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string; caseId: string }> }
) {
  try {
    const { roundId, caseId } = await params;
    const body = await req.json();

    const statusError = validateResultStatus(body.status);
    if (statusError) return NextResponse.json({ error: statusError }, { status: 400 });

    const prisma = getPrisma("production");
    const { round, error } = await getRoundOr404(prisma, roundId);
    if (error) return error;
    const blocked = assertRoundOpen(round);
    if (blocked) return blocked;

    const existing = await prisma.qaRoundItem.findUnique({
      where: { round_id_case_id: { round_id: roundId, case_id: caseId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "존재하지 않는 라운드 항목입니다." }, { status: 404 });
    }

    const actorEmail = await getCurrentAdminEmail();

    const updated = await prisma.qaRoundItem.update({
      where: { round_id_case_id: { round_id: roundId, case_id: caseId } },
      data: {
        ...(body.category_l1 !== undefined && { category_l1: body.category_l1.trim() }),
        ...(body.category_l2 !== undefined && { category_l2: body.category_l2?.trim() || null }),
        ...(body.category_l3 !== undefined && { category_l3: body.category_l3?.trim() || null }),
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.steps !== undefined && { steps: body.steps.trim() }),
        ...(body.expected !== undefined && { expected: body.expected.trim() }),
        ...(body.tester_email !== undefined && { tester_email: body.tester_email || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.device !== undefined && { device: body.device || null }),
        ...(body.situation !== undefined && { situation: body.situation || null }),
        ...(body.screenshot_url !== undefined && { screenshot_url: body.screenshot_url || null }),
        ...(body.detail !== undefined && { detail: body.detail || null }),
        ...(body.confirmed !== undefined && { confirmed: !!body.confirmed }),
        updated_by: actorEmail,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("QA round item update error:", error);
    return NextResponse.json({ error: "Failed to update QA round item" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ roundId: string; caseId: string }> }
) {
  try {
    const { roundId, caseId } = await params;
    const prisma = getPrisma("production");

    const { round, error } = await getRoundOr404(prisma, roundId);
    if (error) return error;
    const blocked = assertRoundOpen(round);
    if (blocked) return blocked;

    const existing = await prisma.qaRoundItem.findUnique({
      where: { round_id_case_id: { round_id: roundId, case_id: caseId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "존재하지 않는 라운드 항목입니다." }, { status: 404 });
    }

    await prisma.qaRoundItem.delete({
      where: { round_id_case_id: { round_id: roundId, case_id: caseId } },
    });

    if (existing.screenshot_url) {
      await deleteFile(existing.screenshot_url).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("QA round item remove error:", error);
    return NextResponse.json({ error: "Failed to remove QA round item" }, { status: 500 });
  }
}
