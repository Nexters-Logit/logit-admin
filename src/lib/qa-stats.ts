export interface QaStatusCounts {
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  tested: number;
  progress: number;
}

export function computeQaStats(
  items: { status?: string | null; checks?: { status: string | null }[] }[]
): QaStatusCounts {
  const total = items.length;
  let pass = 0;
  let fail = 0;
  let blocked = 0;
  for (const item of items) {
    const checks = item.checks ?? [{ status: item.status ?? null }];
    for (const check of checks) {
      if (check.status === "pass") pass++;
      else if (check.status === "fail") fail++;
      else if (check.status === "blocked") blocked++;
    }
  }
  const tested = items.filter((item) =>
    (item.checks ?? [{ status: item.status ?? null }]).some((check) => !!check.status)
  ).length;
  const progress = total ? Math.round((tested / total) * 100) : 0;
  return { total, pass, fail, blocked, tested, progress };
}
