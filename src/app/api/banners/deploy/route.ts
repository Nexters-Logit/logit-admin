import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// dev DB의 배너를 prod DB에 복사
export async function POST(req: NextRequest) {
  if (!process.env.PROD_DATABASE_URL) {
    return NextResponse.json({ error: "Production DB가 설정되지 않았습니다." }, { status: 400 });
  }

  try {
    const { ids }: { ids: number[] } = await req.json();

    const devPrisma = getPrisma("dev");
    const prodPrisma = getPrisma("production");

    const devBanners = await devPrisma.banner.findMany({
      where: { id: { in: ids } },
      orderBy: { display_order: "asc" },
    });

    // prod에 이미 동일한 image_url이 있으면 건너뜀
    const prodBanners = await prodPrisma.banner.findMany();
    const prodUrls = new Set(prodBanners.map((b) => b.image_url));

    const toCreate = devBanners.filter((b) => !prodUrls.has(b.image_url));

    // prod의 현재 마지막 순서 다음부터 추가
    const maxOrder = prodBanners.reduce((max, b) => Math.max(max, b.display_order), -1);

    await Promise.all(
      toCreate.map((b, i) =>
        prodPrisma.banner.create({
          data: {
            image_url: b.image_url,
            link_url: b.link_url,
            is_visible: b.is_visible,
            display_order: maxOrder + 1 + i,
          },
        })
      )
    );

    return NextResponse.json({ deployed: toCreate.length, skipped: devBanners.length - toCreate.length });
  } catch (error) {
    console.error("Banner deploy error:", error);
    return NextResponse.json({ error: "배포에 실패했습니다." }, { status: 500 });
  }
}
