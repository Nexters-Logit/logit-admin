import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getAllowedAdminEmails } from "@/lib/admin-emails";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    const body = await req.json();

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    if (!getAllowedAdminEmails().includes(email)) {
      return NextResponse.json({ error: "허용되지 않은 이메일입니다." }, { status: 400 });
    }

    const prisma = getPrisma("production");
    const user = await prisma.adminUser.upsert({
      where: { email },
      update: { name: body.name.trim() },
      create: { email, name: body.name.trim() },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Failed to update admin user" }, { status: 500 });
  }
}
