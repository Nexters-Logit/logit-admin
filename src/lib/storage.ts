import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Cloudflare R2: endpoint = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.R2_BUCKET ?? "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? ""; // 버킷 퍼블릭 도메인

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // R2는 ACL 대신 Cloudflare 대시보드에서 버킷 퍼블릭 접근 설정
    })
  );
  return `${PUBLIC_URL}/${key}`;
}
