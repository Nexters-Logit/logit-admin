import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function GET() {
  try {
    const prisma = getPrisma(await getServerEnv());
    const banners = await prisma.banner.findMany({
      orderBy: [{ display_order: "asc" }, { created_at: "desc" }],
    });
    return NextResponse.json(banners);
  } catch (error) {
    console.error("Banners list error:", error);
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma(await getServerEnv());
    const body = await req.json();
    const banner = await prisma.banner.create({
      data: {
        image_url: body.image_url,
        link_url: body.link_url || null,
        is_visible: body.is_visible ?? true,
        display_order: body.display_order ?? 0,
      },
    });
    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error("Banner create error:", error);
    return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
  }
}
