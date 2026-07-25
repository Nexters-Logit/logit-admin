import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getCurrentAdminEmail } from "@/lib/auth";
import { validateRoundName, assertCaseIdsExist } from "@/lib/qa";

export async function GET() {
  try {
    const prisma = getPrisma("production");
    const rounds = await prisma.qaRound.findMany({
      orderBy: { created_at: "desc" },
      include: { items: { select: { status: true } } },
    });
    return NextResponse.json(rounds);
  } catch (error) {
    console.error("QA rounds list error:", error);
    return NextResponse.json({ error: "Failed to fetch QA rounds" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nameError = validateRoundName(body.name);
    if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

    const sourceCaseIds: string[] = Array.isArray(body.sourceCaseIds) ? body.sourceCaseIds : [];

    const prisma = getPrisma("production");
    const caseIdError = await assertCaseIdsExist(prisma, sourceCaseIds);
    if (caseIdError) return NextResponse.json({ error: caseIdError }, { status: 400 });

    const actorEmail = await getCurrentAdminEmail();

    const round = await prisma.$transaction(async (tx) => {
      const created = await tx.qaRound.create({
        data: {
          name: body.name.trim(),
          description: body.description?.trim() || null,
          created_by: actorEmail,
        },
      });

      if (sourceCaseIds.length > 0) {
        const cases = await tx.qaTestCase.findMany({ where: { id: { in: sourceCaseIds } } });
        await tx.qaRoundItem.createMany({
          data: cases.map((c) => ({
            round_id: created.id,
            case_id: c.id,
            category_l1: c.category_l1,
            category_l2: c.category_l2,
            category_l3: c.category_l3,
            title: c.title,
            steps: c.steps,
            expected: c.expected,
          })),
        });
      }

      return created;
    });

    return NextResponse.json(round, { status: 201 });
  } catch (error) {
    console.error("QA round create error:", error);
    return NextResponse.json({ error: "Failed to create QA round" }, { status: 500 });
  }
}
