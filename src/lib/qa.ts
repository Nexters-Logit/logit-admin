import { NextResponse } from "next/server";
import type { PrismaClient, QaRound } from "@/generated/prisma/client";

export const RESULT_STATUSES = ["pass", "fail", "blocked"] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];

export const ROUND_STATUSES = ["in_progress", "closed"] as const;
export type RoundStatus = (typeof ROUND_STATUSES)[number];

export function validateRoundName(name: unknown): string | null {
  if (typeof name !== "string" || !name.trim()) return "라운드 이름은 필수입니다.";
  if (name.trim().length > 200) return "라운드 이름은 200자를 넘을 수 없습니다.";
  return null;
}

export function validateResultStatus(status: unknown): string | null {
  if (status !== undefined && status !== null && !RESULT_STATUSES.includes(status as ResultStatus)) {
    return "잘못된 상태 값입니다.";
  }
  return null;
}

export async function assertCaseIdsExist(
  prisma: PrismaClient,
  caseIds: string[]
): Promise<string | null> {
  if (caseIds.length === 0) return null;
  const uniqueIds = Array.from(new Set(caseIds));
  const found = await prisma.qaTestCase.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });
  if (found.length !== uniqueIds.length) {
    return "존재하지 않는 테스트 항목이 포함되어 있습니다.";
  }
  return null;
}

export async function getRoundOr404(
  prisma: PrismaClient,
  roundId: string
): Promise<{ round: QaRound; error: null } | { round: null; error: NextResponse }> {
  const round = await prisma.qaRound.findUnique({ where: { id: roundId } });
  if (!round) {
    return { round: null, error: NextResponse.json({ error: "존재하지 않는 라운드입니다." }, { status: 404 }) };
  }
  return { round, error: null };
}

export function assertRoundOpen(round: { status: string }): NextResponse | null {
  if (round.status === "closed") {
    return NextResponse.json({ error: "종료된 라운드는 수정할 수 없습니다." }, { status: 409 });
  }
  return null;
}
