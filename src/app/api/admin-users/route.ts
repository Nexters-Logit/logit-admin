import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getAllowedAdminEmails } from "@/lib/admin-emails";

export async function GET() {
  try {
    const prisma = getPrisma("production");
    const allowed = getAllowedAdminEmails();

    await Promise.all(
      allowed.map((email) =>
        prisma.adminUser.upsert({
          where: { email },
          update: {},
          create: { email, name: email.split("@")[0] },
        })
      )
    );

    const users = await prisma.adminUser.findMany({
      where: { email: { in: allowed } },
      orderBy: { email: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json({ error: "Failed to fetch admin users" }, { status: 500 });
  }
}
