import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma(await getServerEnv());
    const { ids }: { ids: number[] } = await req.json();

    await Promise.all(
      ids.map((id, index) =>
        prisma.banner.update({
          where: { id },
          data: { display_order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Banner reorder error:", error);
    return NextResponse.json({ error: "Failed to reorder banners" }, { status: 500 });
  }
}
