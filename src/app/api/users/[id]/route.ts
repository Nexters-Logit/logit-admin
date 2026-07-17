import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getQdrant, getCollectionName } from "@/lib/qdrant";
import { getServerEnv } from "@/lib/env";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const qdrantClient = getQdrant(env);
    const collection = getCollectionName(env);
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { chats: true, projects: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let experienceCount = 0;
    try {
      const countResult = await qdrantClient.count(collection, {
        filter: {
          must: [{ key: "user_id", match: { value: id } }],
        },
        exact: true,
      });
      experienceCount = countResult.count;
    } catch {
      // Qdrant not available
    }

    return NextResponse.json({ ...user, experienceCount });
  } catch (error) {
    console.error("User detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma(await getServerEnv());
    const { id } = await params;
    const body = await req.json();
    const user = await prisma.user.update({
      where: { id },
      data: { is_active: body.is_active },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const qdrantClient = getQdrant(env);
    const collection = getCollectionName(env);
    const { id } = await params;

    // 하나의 트랜잭션으로 묶어, 중간에 실패해도 일부만 삭제된 채 남지 않도록 한다.
    await prisma.$transaction([
      prisma.chat.deleteMany({ where: { user_id: id } }),
      prisma.question.deleteMany({ where: { user_id: id } }),
      prisma.project.deleteMany({ where: { user_id: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    try {
      await qdrantClient.delete(collection, {
        filter: {
          must: [{ key: "user_id", match: { value: id } }],
        },
      });
    } catch {
      // Qdrant cleanup failed
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
