import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const prisma = getPrisma("production");
    const qaCase = await prisma.qaTestCase.update({
      where: { id },
      data: {
        ...(body.category_l1 !== undefined && { category_l1: body.category_l1.trim() }),
        ...(body.category_l2 !== undefined && { category_l2: body.category_l2?.trim() || null }),
        ...(body.category_l3 !== undefined && { category_l3: body.category_l3?.trim() || null }),
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.steps !== undefined && { steps: body.steps.trim() }),
        ...(body.expected !== undefined && { expected: body.expected.trim() }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });
    return NextResponse.json(qaCase);
  } catch (error) {
    console.error("QA case update error:", error);
    return NextResponse.json({ error: "Failed to update QA case" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prisma = getPrisma("production");

    await prisma.qaTestCase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "하나 이상의 라운드에서 사용 중이라 삭제할 수 없습니다." },
        { status: 409 }
      );
    }
    console.error("QA case delete error:", error);
    return NextResponse.json({ error: "Failed to delete QA case" }, { status: 500 });
  }
}
