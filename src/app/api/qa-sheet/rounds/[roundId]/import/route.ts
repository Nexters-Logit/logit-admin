import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { assertRoundOpen, getRoundOr404 } from "@/lib/qa";

interface ImportRow {
  category_l1: string;
  category_l2?: string;
  category_l3?: string;
  title: string;
  steps: string;
  expected: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params;
    const body = await req.json();
    const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "가져올 항목이 없습니다." }, { status: 400 });
    }
    for (const [i, row] of rows.entries()) {
      if (!row.category_l1?.trim() || !row.title?.trim() || !row.steps?.trim() || !row.expected?.trim()) {
        return NextResponse.json(
          { error: `${i + 1}번째 행: 대분류/테스트 항목/절차/기대 결과는 필수입니다.` },
          { status: 400 }
        );
      }
    }

    const prisma = getPrisma("production");
    const { round, error } = await getRoundOr404(prisma, roundId);
    if (error) return error;
    const blocked = assertRoundOpen(round);
    if (blocked) return blocked;

    let casesCreated = 0;
    let casesReused = 0;
    let itemsAdded = 0;
    let itemsSkipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const category_l1 = row.category_l1.trim();
        const category_l2 = row.category_l2?.trim() || null;
        const category_l3 = row.category_l3?.trim() || null;
        const title = row.title.trim();
        const steps = row.steps.trim();
        const expected = row.expected.trim();

        let qaCase = await tx.qaTestCase.findFirst({
          where: { category_l1, category_l2, category_l3, title },
        });
        if (qaCase) {
          casesReused++;
        } else {
          qaCase = await tx.qaTestCase.create({
            data: { category_l1, category_l2, category_l3, title, steps, expected },
          });
          casesCreated++;
        }

        const existingItem = await tx.qaRoundItem.findUnique({
          where: { round_id_case_id: { round_id: roundId, case_id: qaCase.id } },
        });
        if (existingItem) {
          itemsSkipped++;
          continue;
        }
        await tx.qaRoundItem.create({
          data: {
            round_id: roundId,
            case_id: qaCase.id,
            category_l1: qaCase.category_l1,
            category_l2: qaCase.category_l2,
            category_l3: qaCase.category_l3,
            title: qaCase.title,
            steps: qaCase.steps,
            expected: qaCase.expected,
          },
        });
        itemsAdded++;
      }
    });

    return NextResponse.json(
      { casesCreated, casesReused, itemsAdded, itemsSkipped },
      { status: 201 }
    );
  } catch (error) {
    console.error("QA round CSV import error:", error);
    return NextResponse.json({ error: "가져오기에 실패했습니다." }, { status: 500 });
  }
}
