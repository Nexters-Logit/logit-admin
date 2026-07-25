import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { assertCaseIdsExist, assertRoundOpen, getRoundOr404 } from "@/lib/qa";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;
    const prisma = getPrisma("production");

    const { error } = await getRoundOr404(prisma, roundId);
    if (error) return error;

    const items = await prisma.qaRoundItem.findMany({
      where: { round_id: roundId },
      orderBy: [
        { category_l1: "asc" },
        { category_l2: "asc" },
        { category_l3: "asc" },
        { created_at: "asc" },
      ],
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("QA round items list error:", error);
    return NextResponse.json({ error: "Failed to fetch QA round items" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;
    const body = await req.json();
    const caseIds: string[] = Array.isArray(body.caseIds) ? body.caseIds : [];
    if (caseIds.length === 0) {
      return NextResponse.json({ error: "추가할 항목이 없습니다." }, { status: 400 });
    }

    const prisma = getPrisma("production");
    const { round, error } = await getRoundOr404(prisma, roundId);
    if (error) return error;
    const blocked = assertRoundOpen(round);
    if (blocked) return blocked;

    const caseIdError = await assertCaseIdsExist(prisma, caseIds);
    if (caseIdError) return NextResponse.json({ error: caseIdError }, { status: 400 });

    const cases = await prisma.qaTestCase.findMany({ where: { id: { in: caseIds } } });
    await prisma.qaRoundItem.createMany({
      data: cases.map((c) => ({
        round_id: roundId,
        case_id: c.id,
        category_l1: c.category_l1,
        category_l2: c.category_l2,
        category_l3: c.category_l3,
        title: c.title,
        steps: c.steps,
        expected: c.expected,
      })),
      skipDuplicates: true,
    });

    const items = await prisma.qaRoundItem.findMany({
      where: { round_id: roundId, case_id: { in: caseIds } },
    });
    return NextResponse.json(items, { status: 201 });
  } catch (error) {
    console.error("QA round item attach error:", error);
    return NextResponse.json({ error: "Failed to add cases to round" }, { status: 500 });
  }
}
