import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma(await getServerEnv());
    const { id } = await params;
    const body = await req.json();
    const banner = await prisma.banner.update({
      where: { id: Number(id) },
      data: {
        ...(body.image_url !== undefined && { image_url: body.image_url }),
        ...(body.link_url !== undefined && { link_url: body.link_url || null }),
        ...(body.is_visible !== undefined && { is_visible: body.is_visible }),
        ...(body.display_order !== undefined && { display_order: body.display_order }),
      },
    });
    return NextResponse.json(banner);
  } catch (error) {
    console.error("Banner update error:", error);
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma(await getServerEnv());
    const { id } = await params;
    await prisma.banner.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Banner delete error:", error);
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}
