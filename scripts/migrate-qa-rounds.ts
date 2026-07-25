/**
 * QA 라운드(버전 관리) 도입을 위한 1회성 백필 스크립트.
 *
 * 사전 조건: qa_rounds 테이블 + qa_test_results의 신규 nullable 컬럼이 이미 DB에
 * 존재해야 한다 (STEP A). 이 스크립트가 데이터를 채우고 나면 STEP C(복합 PK 강화)를
 * 적용한다.
 *
 * 전체 실행 순서 (dev에서 먼저 검증한 뒤 prod에 동일하게 반복):
 *   1) DATABASE_URL="$DEV_DATABASE_URL" bunx prisma db push --schema=prisma/schema.step-a.prisma
 *   2) npx tsx scripts/migrate-qa-rounds.ts dev
 *   3) DATABASE_URL="$DEV_DATABASE_URL" bunx prisma db push        (최종 schema.prisma)
 *   4) 위 1~3을 prod로 반복 (DATABASE_URL="$PROD_DATABASE_URL", 인자 prod)
 *   5) prisma/schema.step-a.prisma 삭제
 *
 * 기존 qa_test_case 전체를 "v1.0 초기 출시 QA" 라운드 하나로 감싼다. 기존
 * qa_test_result가 있던 케이스는 결과를 유지한 채 라운드에 연결 + 스냅샷(제목/절차/
 * 기대결과/카테고리)을 채우고, 결과가 아예 없던 케이스는 스냅샷만 채운 빈 row를
 * 새로 만든다.
 *
 * raw SQL만 사용한다 — 이 시점의 DB는 아직 STEP A(단일 PK, nullable 컬럼) 상태라
 * 최종 스키마로 생성된 타입 클라이언트(QaRoundItem 모델)와 실제 테이블 모양이 달라
 * upsert 등 타입 API를 쓸 수 없다. 전체를 하나의 트랜잭션으로 묶어 검증에 실패하면
 * 자동 롤백되고, round_id가 이미 채워진 행은 건드리지 않으므로 재실행해도 안전하다.
 *
 * 주의: 이 마이그레이션이 끝나고 STEP C까지 적용한 뒤에는 재실행하지 말 것 — 그 이후
 * "결과 row가 없는 케이스"가 생기면(신규 케이스를 만들고 아직 어떤 라운드에도 담지
 * 않은 정상적인 상태) 이 스크립트가 그걸 전부 "v1.0 초기 출시 QA" 라운드로 잘못
 * 편입시킨다.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { randomUUID } from "crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local", override: true });

type TargetEnv = "dev" | "prod";

const INITIAL_ROUND_NAME = "v1.0 초기 출시 QA";

function resolveUrl(env: TargetEnv): string {
  const url =
    env === "prod"
      ? process.env.PROD_DATABASE_URL
      : process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error(`Database URL not configured for "${env}"`);
  return url;
}

async function main() {
  const targetEnv: TargetEnv = process.argv[2] === "prod" ? "prod" : "dev";
  const adapter = new PrismaPg({ connectionString: resolveUrl(targetEnv) });
  const prisma = new PrismaClient({ adapter });

  console.log(`Backfilling QA rounds on "${targetEnv}" database…`);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM qa_rounds WHERE name = $1 LIMIT 1`,
        INITIAL_ROUND_NAME
      );

      let roundId: string;
      if (existing.length > 0) {
        roundId = existing[0].id;
        console.log(`Reusing existing round "${INITIAL_ROUND_NAME}" (${roundId})`);
      } else {
        roundId = randomUUID();
        await tx.$executeRawUnsafe(
          `INSERT INTO qa_rounds (id, name, status, created_at, updated_at)
           VALUES ($1, $2, 'in_progress', now(), now())`,
          roundId,
          INITIAL_ROUND_NAME
        );
        console.log(`Created round "${INITIAL_ROUND_NAME}" (${roundId})`);
      }

      const linked = await tx.$executeRawUnsafe(
        `UPDATE qa_test_results r
         SET round_id = $1,
             category_l1 = c.category_l1,
             category_l2 = c.category_l2,
             category_l3 = c.category_l3,
             title = c.title,
             steps = c.steps,
             expected = c.expected
         FROM qa_test_cases c
         WHERE r.case_id = c.id AND r.round_id IS NULL`,
        roundId
      );
      console.log(`Linked ${linked} existing result row(s) to the round.`);

      const inserted = await tx.$executeRawUnsafe(
        `INSERT INTO qa_test_results
           (case_id, round_id, category_l1, category_l2, category_l3, title, steps, expected, confirmed, updated_at)
         SELECT c.id, $1, c.category_l1, c.category_l2, c.category_l3, c.title, c.steps, c.expected, false, now()
         FROM qa_test_cases c
         WHERE NOT EXISTS (SELECT 1 FROM qa_test_results r WHERE r.case_id = c.id)`,
        roundId
      );
      console.log(`Created ${inserted} blank result row(s) for previously untested cases.`);

      const [{ null_round }] = await tx.$queryRawUnsafe<{ null_round: number }[]>(
        `SELECT count(*)::int AS null_round FROM qa_test_results WHERE round_id IS NULL`
      );
      const [{ null_title }] = await tx.$queryRawUnsafe<{ null_title: number }[]>(
        `SELECT count(*)::int AS null_title FROM qa_test_results WHERE title IS NULL`
      );
      const [{ case_count }] = await tx.$queryRawUnsafe<{ case_count: number }[]>(
        `SELECT count(*)::int AS case_count FROM qa_test_cases`
      );
      const [{ result_case_count }] = await tx.$queryRawUnsafe<{ result_case_count: number }[]>(
        `SELECT count(DISTINCT case_id)::int AS result_case_count FROM qa_test_results`
      );

      if (null_round > 0) {
        throw new Error(`Assertion failed: ${null_round} result row(s) still have round_id = NULL`);
      }
      if (null_title > 0) {
        throw new Error(`Assertion failed: ${null_title} result row(s) still have title = NULL`);
      }
      if (case_count !== result_case_count) {
        throw new Error(
          `Assertion failed: qa_test_case count (${case_count}) !== distinct case_id in qa_test_results (${result_case_count})`
        );
      }

      console.log("All assertions passed.");
    });

    console.log(
      `Backfill complete. Next: DATABASE_URL="$${targetEnv === "prod" ? "PROD" : "DEV"}_DATABASE_URL" bunx prisma db push  (final schema.prisma) to apply the composite key + constraints.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
