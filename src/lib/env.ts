import { cookies } from "next/headers";
import type { ServerEnv } from "./prisma";

const COOKIE_NAME = "admin-server-env";

export async function getServerEnv(): Promise<ServerEnv> {
  const cookieStore = await cookies();
  const env = cookieStore.get(COOKIE_NAME)?.value;
  return env === "production" ? "production" : "dev";
}

/**
 * 현재 선택된 환경(dev/production)에 맞는 BE 내부 엔드포인트 주소를 반환한다.
 * DB 연결(getPrisma)과 동일하게 화면 토글을 따라가야 한다 — 하나로 고정된
 * BE_INTERNAL_URL을 쓰면 "production" 화면을 보면서 실제로는 dev 백엔드를
 * 건드리는(또는 그 반대) 불일치가 생긴다.
 */
export function getBeUrl(env: ServerEnv): string {
  const url = env === "production" ? process.env.PROD_BE_INTERNAL_URL : process.env.DEV_BE_INTERNAL_URL;
  if (!url) throw new Error(`BE URL not configured for ${env}`);
  return url;
}
