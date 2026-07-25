"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useQaRound, useUpdateQaRound } from "@/hooks/use-qa-rounds";
import {
  useQaRoundItems,
  useAddCasesToRound,
  useRemoveCaseFromRound,
  useImportQaRoundItems,
  type QaRoundItem,
} from "@/hooks/use-qa-round-items";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { computeQaStats } from "@/lib/qa-stats";
import { toCsv } from "@/lib/csv";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QaAddCasesDialog } from "./qa-add-cases-dialog";
import { QaCsvImportDialog } from "./qa-csv-import-dialog";
import { QaRoundItemRow } from "./qa-round-item-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead } from "@/components/ui/table";
import { Plus, Download, Upload, ChevronsUpDown, ArrowLeft, Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pass" | "fail" | "blocked" | "untested";

interface QaRoundDetailContentProps {
  roundId: string;
}

export function QaRoundDetailContent({ roundId }: QaRoundDetailContentProps) {
  const { data: round, isLoading: roundLoading } = useQaRound(roundId);
  const { data: items, isLoading: itemsLoading } = useQaRoundItems(roundId);
  const { data: testers = [] } = useAdminUsers();
  const updateRound = useUpdateQaRound();
  const addCases = useAddCasesToRound(roundId);
  const removeCase = useRemoveCaseFromRound(roundId);
  const importItems = useImportQaRoundItems(roundId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [testerFilter, setTesterFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const toggleExpand = (caseId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allItems = useMemo(() => items ?? [], [items]);
  const stats = useMemo(() => computeQaStats(allItems), [allItems]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter !== "all") {
        if (statusFilter === "untested") {
          if (it.status) return false;
        } else if (it.status !== statusFilter) {
          return false;
        }
      }
      if (testerFilter !== "all" && it.tester_email !== testerFilter) return false;
      if (term) {
        const haystack = `${it.title} ${it.steps} ${it.category_l1} ${it.category_l2 ?? ""} ${it.category_l3 ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [allItems, search, statusFilter, testerFilter]);

  const groups = useMemo(() => {
    const byL1 = new Map<string, Map<string, QaRoundItem[]>>();
    for (const it of filtered) {
      if (!byL1.has(it.category_l1)) byL1.set(it.category_l1, new Map());
      const byL2 = byL1.get(it.category_l1)!;
      const l2Key = it.category_l2 ?? "";
      if (!byL2.has(l2Key)) byL2.set(l2Key, []);
      byL2.get(l2Key)!.push(it);
    }
    return byL1;
  }, [filtered]);

  const handleExportCsv = () => {
    const header = [
      "대분류", "중분류", "소분류", "테스트 항목", "테스트 절차", "기대 결과",
      "담당자", "상태", "디바이스/환경", "발생 상황", "스크린샷", "상세 내용", "담당자 확인",
    ];
    const testerName = (email: string | null) =>
      testers.find((t) => t.email === email)?.name ?? email ?? "";
    const rows = allItems.map((it) => [
      it.category_l1, it.category_l2 ?? "", it.category_l3 ?? "", it.title, it.steps, it.expected,
      testerName(it.tester_email),
      it.status === "pass" ? "Pass" : it.status === "fail" ? "Fail" : it.status === "blocked" ? "보류" : "",
      it.device ?? "", it.situation ?? "", it.screenshot_url ?? "", it.detail ?? "", it.confirmed ? "확인" : "",
    ]);
    const csv = toCsv([header, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qa-round-${round?.name ?? roundId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (roundLoading) {
    return <Skeleton className="h-40 w-full rounded-lg" />;
  }
  if (!round) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center rounded-xl border border-dashed text-sm">
        라운드를 찾을 수 없습니다.
      </div>
    );
  }

  const roundClosed = round.status === "closed";

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/qa-rounds"
          className="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          라운드 목록
        </Link>
        <PageHeader title={round.name} description={round.description ?? undefined}>
          <Badge variant={roundClosed ? "secondary" : "default"}>
            {roundClosed ? "종료" : "진행 중"}
          </Badge>
          <Button
            variant="outline"
            disabled={updateRound.isPending}
            onClick={() =>
              updateRound.mutate(
                { id: roundId, status: roundClosed ? "in_progress" : "closed" },
                {
                  onSuccess: () =>
                    toast.success(roundClosed ? "라운드를 재개했습니다." : "라운드를 종료했습니다."),
                  onError: () => toast.error("상태 변경에 실패했습니다."),
                }
              )
            }
          >
            {roundClosed ? (
              <LockOpen className="mr-2 h-4 w-4" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            {roundClosed ? "라운드 재개" : "라운드 종료"}
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} disabled={roundClosed}>
            <Upload className="mr-2 h-4 w-4" />
            CSV로 가져오기
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} disabled={roundClosed}>
            <Plus className="mr-2 h-4 w-4" />
            항목 추가
          </Button>
        </PageHeader>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "전체 항목", value: stats.total, color: "text-foreground" },
          { label: "Pass", value: stats.pass, color: "text-emerald-600" },
          { label: "Fail", value: stats.fail, color: "text-red-600" },
          { label: "보류", value: stats.blocked, color: "text-amber-500" },
          { label: "진행률", value: `${stats.progress}%`, color: "text-foreground" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-lg border p-3">
            <p className={cn("text-2xl font-bold tabular-nums", tile.color)}>{tile.value}</p>
            <p className="text-muted-foreground text-xs">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="테스트 항목 검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-56"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="blocked">보류</SelectItem>
            <SelectItem value="untested">미실행</SelectItem>
          </SelectContent>
        </Select>
        <Select value={testerFilter} onValueChange={setTesterFilter}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 담당자</SelectItem>
            {testers.map((t) => (
              <SelectItem key={t.email} value={t.email}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          CSV 내보내기
        </Button>
      </div>

      {itemsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : groups.size === 0 ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center rounded-xl border border-dashed text-sm">
          조건에 맞는 테스트 항목이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(groups.entries()).map(([l1, byL2]) => {
            const l1Items = Array.from(byL2.values()).flat();
            const failCount = l1Items.filter((it) => it.status === "fail").length;
            const isOpen = openGroups.has(l1);
            return (
              <div key={l1} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => toggleGroup(l1)}
                  className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-t-lg px-4 py-3 text-left"
                >
                  <ChevronsUpDown className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="font-semibold">{l1}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{l1Items.length}개 항목</span>
                  {failCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Fail {failCount}
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div className="overflow-x-auto border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-56">테스트 항목</TableHead>
                          <TableHead className="w-64">테스트 절차</TableHead>
                          <TableHead className="w-56">기대 결과</TableHead>
                          <TableHead className="w-32">담당자</TableHead>
                          <TableHead className="w-40">상태</TableHead>
                          <TableHead className="w-28" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(byL2.entries()).map(([l2, l2Items]) => (
                          <Fragment key={l2 || "__none__"}>
                            {l2 && (
                              <TableRow className="hover:bg-transparent">
                                <td colSpan={6} className="text-muted-foreground bg-muted/30 px-2 py-1.5 text-xs font-semibold">
                                  {l2}
                                </td>
                              </TableRow>
                            )}
                            {l2Items.map((it) => (
                              <QaRoundItemRow
                                key={it.case_id}
                                item={it}
                                roundId={roundId}
                                roundClosed={roundClosed}
                                testers={testers}
                                expanded={expandedIds.has(it.case_id)}
                                onToggleExpand={() => toggleExpand(it.case_id)}
                                onRemove={() => setRemoveTarget(it.case_id)}
                              />
                            ))}
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <QaAddCasesDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        excludeIds={new Set(allItems.map((it) => it.case_id))}
        isPending={addCases.isPending}
        onSubmit={(caseIds) => {
          addCases.mutate(caseIds, {
            onSuccess: () => {
              toast.success("항목을 추가했습니다.");
              setAddDialogOpen(false);
            },
            onError: (e) => toast.error(e instanceof Error ? e.message : "추가에 실패했습니다."),
          });
        }}
      />

      <QaCsvImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        isPending={importItems.isPending}
        onSubmit={(rows) => {
          importItems.mutate(rows, {
            onSuccess: (result) => {
              toast.success(
                `가져오기 완료 — 신규 케이스 ${result.casesCreated}개, 기존 케이스 재사용 ${result.casesReused}개, 라운드에 추가 ${result.itemsAdded}개${result.itemsSkipped ? `, 이미 있던 항목 ${result.itemsSkipped}개 건너뜀` : ""}`
              );
              setImportDialogOpen(false);
            },
            onError: (e) => toast.error(e instanceof Error ? e.message : "가져오기에 실패했습니다."),
          });
        }}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="라운드에서 제거"
        description="이 항목과 이 라운드에서의 체크 결과가 삭제됩니다. 케이스 뱅크의 원본은 그대로 유지됩니다."
        variant="destructive"
        confirmLabel="제거"
        loading={removeCase.isPending}
        onConfirm={() => {
          if (!removeTarget) return;
          removeCase.mutate(removeTarget, {
            onSuccess: () => {
              toast.success("제거했습니다.");
              setRemoveTarget(null);
            },
            onError: (e) => toast.error(e instanceof Error ? e.message : "제거에 실패했습니다."),
          });
        }}
      />
    </div>
  );
}
