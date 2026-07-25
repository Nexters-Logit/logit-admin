import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getCurrentAdminEmail } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";
import { ROUND_STATUSES, validateRoundName, getRoundOr404 } from "@/lib/qa";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;
    const prisma = getPrisma("production");
    const { round, error } = await getRoundOr404(prisma, roundId);
    if (error) return error;
    return NextResponse.json(round);
  } catch (error) {
    console.error("QA round get error:", error);
    return NextResponse.json({ error: "Failed to fetch QA round" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;
    const body = await req.json();

    if (body.name !== undefined) {
      const nameError = validateRoundName(body.name);
      if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });
    }
    if (body.status !== undefined && !ROUND_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "잘못된 라운드 상태 값입니다." }, { status: 400 });
    }

    const prisma = getPrisma("production");
    const { round, error } = await getRoundOr404(prisma, roundId);
    if (error) return error;

    const actorEmail = await getCurrentAdminEmail();
    const closing = body.status === "closed" && round.status !== "closed";
    const reopening = body.status === "in_progress" && round.status === "closed";

    const updated = await prisma.qaRound.update({
      where: { id: roundId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(closing && { closed_by: actorEmail, closed_at: new Date() }),
        ...(reopening && { closed_by: null, closed_at: null }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("QA round update error:", error);
    return NextResponse.json({ error: "Failed to update QA round" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;
    const prisma = getPrisma("production");

    const { error } = await getRoundOr404(prisma, roundId);
    if (error) return error;

    const items = await prisma.qaRoundItem.findMany({
      where: { round_id: roundId, screenshot_url: { not: null } },
      select: { screenshot_url: true },
    });
    await prisma.qaRound.delete({ where: { id: roundId } });

    await Promise.all(
      items.map((i) => (i.screenshot_url ? deleteFile(i.screenshot_url).catch(() => {}) : Promise.resolve()))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("QA round delete error:", error);
    return NextResponse.json({ error: "Failed to delete QA round" }, { status: 500 });
  }
}
