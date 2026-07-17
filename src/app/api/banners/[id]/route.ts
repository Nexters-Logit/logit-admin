import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";
import { deleteFile } from "@/lib/storage";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma(await getServerEnv());
    const { id } = await params;
    const body = await req.json();

    // 이미지가 교체되는 경우 기존 이미지 URL을 미리 기억해둔다.
    // 실제 삭제는 DB 업데이트가 성공한 뒤에 수행한다 — 먼저 지우면
    // update가 실패했을 때 DB는 여전히 (이미 지워진) 옛 이미지를 가리키게 된다.
    let previousImageUrl: string | null = null;
    if (body.image_url !== undefined) {
      const existing = await prisma.banner.findUnique({ where: { id: Number(id) } });
      if (existing && existing.image_url !== body.image_url) {
        previousImageUrl = existing.image_url;
      }
    }

    const banner = await prisma.banner.update({
      where: { id: Number(id) },
      data: {
        ...(body.image_url !== undefined && { image_url: body.image_url }),
        ...(body.link_url !== undefined && { link_url: body.link_url || null }),
        ...(body.is_visible !== undefined && { is_visible: body.is_visible }),
        ...(body.display_order !== undefined && { display_order: body.display_order }),
      },
    });

    if (previousImageUrl) {
      await deleteFile(previousImageUrl).catch(() => {});
    }

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

    const existing = await prisma.banner.findUnique({ where: { id: Number(id) } });
    await prisma.banner.delete({ where: { id: Number(id) } });

    // DB 삭제 후 R2 이미지 삭제 (실패해도 응답에 영향 없음)
    if (existing) {
      await deleteFile(existing.image_url).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Banner delete error:", error);
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}
