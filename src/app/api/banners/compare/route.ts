import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const prodConfigured = !!process.env.PROD_DATABASE_URL;

  const devBanners = await getPrisma("dev").banner.findMany({
    orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
  });

  if (!prodConfigured) {
    return NextResponse.json({ devBanners, prodOnlyBanners: [], devOnlyBanners: devBanners, prodConfigured: false });
  }

  try {
    const prodBanners = await getPrisma("production").banner.findMany({
      orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
    });

    const prodUrls = new Set(prodBanners.map((b) => b.image_url));
    const devOnlyBanners = devBanners.filter((b) => !prodUrls.has(b.image_url));

    return NextResponse.json({ devBanners, prodBanners, devOnlyBanners, prodConfigured: true });
  } catch {
    return NextResponse.json({ devBanners, prodBanners: [], devOnlyBanners: devBanners, prodConfigured: false });
  }
}
