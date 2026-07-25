import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prisma = getPrisma("production");
    const cases = await prisma.qaTestCase.findMany({
      orderBy: [
        { category_l1: "asc" },
        { category_l2: "asc" },
        { category_l3: "asc" },
        { order: "asc" },
      ],
    });
    return NextResponse.json(cases);
  } catch (error) {
    console.error("QA cases list error:", error);
    return NextResponse.json({ error: "Failed to fetch QA cases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.category_l1?.trim() || !body.title?.trim() || !body.steps?.trim() || !body.expected?.trim()) {
      return NextResponse.json(
        { error: "대분류, 테스트 항목, 절차, 기대 결과는 필수입니다." },
        { status: 400 }
      );
    }

    const prisma = getPrisma("production");
    const qaCase = await prisma.qaTestCase.create({
      data: {
        category_l1: body.category_l1.trim(),
        category_l2: body.category_l2?.trim() || null,
        category_l3: body.category_l3?.trim() || null,
        title: body.title.trim(),
        steps: body.steps.trim(),
        expected: body.expected.trim(),
        order: body.order ?? 0,
      },
    });
    return NextResponse.json(qaCase, { status: 201 });
  } catch (error) {
    console.error("QA case create error:", error);
    return NextResponse.json({ error: "Failed to create QA case" }, { status: 500 });
  }
}
