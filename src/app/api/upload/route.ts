import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { randomUUID } from "crypto";
import { extname } from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "JPG, PNG, WebP, GIF만 업로드 가능합니다." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 5MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const ext = extname(file.name) || `.${file.type.split("/")[1]}`;
    const key = `banners/${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadFile(buffer, key, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "업로드에 실패했습니다." }, { status: 500 });
  }
}
