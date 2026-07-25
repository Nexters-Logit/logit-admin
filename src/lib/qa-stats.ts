export interface QaStatusCounts {
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  tested: number;
  progress: number;
}

export function computeQaStats(items: { status: string | null }[]): QaStatusCounts {
  const total = items.length;
  let pass = 0;
  let fail = 0;
  let blocked = 0;
  for (const item of items) {
    if (item.status === "pass") pass++;
    else if (item.status === "fail") fail++;
    else if (item.status === "blocked") blocked++;
  }
  const tested = pass + fail + blocked;
  const progress = total ? Math.round((tested / total) * 100) : 0;
  return { total, pass, fail, blocked, tested, progress };
}
