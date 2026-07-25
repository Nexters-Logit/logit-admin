import { randomUUID } from "crypto";
import type { PrismaClient } from "@/generated/prisma/client";

export interface QaRoundItemCheck {
  id: string;
  round_id: string;
  case_id: string;
  tester_email: string;
  status: "pass" | "fail" | "blocked" | null;
  device: string | null;
  situation: string | null;
  screenshot_url: string | null;
  detail: string | null;
  confirmed: boolean;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

let checksTableReady = false;

export async function ensureQaChecksTable(prisma: PrismaClient) {
  if (checksTableReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS qa_round_item_checks (
      id uuid PRIMARY KEY,
      round_id text NOT NULL,
      case_id text NOT NULL,
      tester_email varchar(255) NOT NULL,
      status text CHECK (status IS NULL OR status IN ('pass', 'fail', 'blocked')),
      device text,
      situation text,
      screenshot_url text,
      detail text,
      confirmed boolean NOT NULL DEFAULT false,
      updated_by varchar(255),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT qa_round_item_checks_round_item_fkey
        FOREIGN KEY (round_id, case_id)
        REFERENCES qa_test_results(round_id, case_id)
        ON DELETE CASCADE,
      CONSTRAINT qa_round_item_checks_unique_tester
        UNIQUE (round_id, case_id, tester_email)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS qa_round_item_checks_round_case_idx
    ON qa_round_item_checks(round_id, case_id)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS qa_round_item_checks_status_idx
    ON qa_round_item_checks(status)
  `);

  checksTableReady = true;
}

export async function getChecksForRound(
  prisma: PrismaClient,
  roundId: string
): Promise<QaRoundItemCheck[]> {
  await ensureQaChecksTable(prisma);
  return prisma.$queryRawUnsafe<QaRoundItemCheck[]>(
    `SELECT * FROM qa_round_item_checks WHERE round_id = $1 ORDER BY updated_at DESC`,
    roundId
  );
}

export async function upsertMyCheck(
  prisma: PrismaClient,
  data: {
    roundId: string;
    caseId: string;
    testerEmail: string;
    status?: string | null;
    device?: string | null;
    situation?: string | null;
    screenshotUrl?: string | null;
    detail?: string | null;
    confirmed?: boolean;
    updatedBy: string | null;
  }
): Promise<QaRoundItemCheck> {
  await ensureQaChecksTable(prisma);

  const existing = await prisma.$queryRawUnsafe<QaRoundItemCheck[]>(
    `SELECT * FROM qa_round_item_checks WHERE round_id = $1 AND case_id = $2 AND tester_email = $3 LIMIT 1`,
    data.roundId,
    data.caseId,
    data.testerEmail
  );

  const current = existing[0];
  const next = {
    status: data.status !== undefined ? data.status : current?.status ?? null,
    device: data.device !== undefined ? data.device : current?.device ?? null,
    situation: data.situation !== undefined ? data.situation : current?.situation ?? null,
    screenshotUrl:
      data.screenshotUrl !== undefined ? data.screenshotUrl : current?.screenshot_url ?? null,
    detail: data.detail !== undefined ? data.detail : current?.detail ?? null,
    confirmed: data.confirmed !== undefined ? data.confirmed : current?.confirmed ?? false,
  };

  const rows = await prisma.$queryRawUnsafe<QaRoundItemCheck[]>(
    `
      INSERT INTO qa_round_item_checks
        (id, round_id, case_id, tester_email, status, device, situation, screenshot_url, detail, confirmed, updated_by, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), $10, $11, now(), now())
      ON CONFLICT (round_id, case_id, tester_email)
      DO UPDATE SET
        status = EXCLUDED.status,
        device = EXCLUDED.device,
        situation = EXCLUDED.situation,
        screenshot_url = EXCLUDED.screenshot_url,
        detail = EXCLUDED.detail,
        confirmed = EXCLUDED.confirmed,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
      RETURNING *
    `,
    current?.id ?? randomUUID(),
    data.roundId,
    data.caseId,
    data.testerEmail,
    next.status,
    next.device ?? "",
    next.situation ?? "",
    next.screenshotUrl ?? "",
    next.detail ?? "",
    next.confirmed,
    data.updatedBy
  );

  return rows[0];
}
