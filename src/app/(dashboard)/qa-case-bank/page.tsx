"use client";

import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useQaCases,
  useCreateQaCase,
  useUpdateQaCase,
  useDeleteQaCase,
  type QaTestCase,
  type QaTestCaseFormData,
} from "@/hooks/use-qa-cases";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { QaCaseDialog } from "@/components/qa/qa-case-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ChevronsUpDown } from "lucide-react";

export default function QaCaseBankPage() {
  const { data: cases, isLoading } = useQaCases();
  const createCase = useCreateQaCase();
  const updateCase = useUpdateQaCase();
  const deleteCase = useDeleteQaCase();

  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QaTestCase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QaTestCase | null>(null);

  const allCases = useMemo(() => cases ?? [], [cases]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const categoryL1Options = useMemo(
    () => Array.from(new Set(allCases.map((c) => c.category_l1))).sort(),
    [allCases]
  );
  const categoryL2Options = useMemo(
    () =>
      Array.from(new Set(allCases.map((c) => c.category_l2).filter((v): v is string => !!v))).sort(),
    [allCases]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allCases;
    return allCases.filter((c) =>
      `${c.title} ${c.steps} ${c.category_l1} ${c.category_l2 ?? ""} ${c.category_l3 ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [allCases, search]);

  const groups = useMemo(() => {
    const byL1 = new Map<string, Map<string, QaTestCase[]>>();
    for (const c of filtered) {
      if (!byL1.has(c.category_l1)) byL1.set(c.category_l1, new Map());
      const byL2 = byL1.get(c.category_l1)!;
      const l2Key = c.category_l2 ?? "";
      if (!byL2.has(l2Key)) byL2.set(l2Key, []);
      byL2.get(l2Key)!.push(c);
    }
    return byL1;
  }, [filtered]);

  const handleSubmitCase = (data: QaTestCaseFormData) => {
    if (editTarget) {
      updateCase.mutate(
        { id: editTarget.id, ...data },
        {
          onSuccess: () => {
            toast.success("테스트 항목을 수정했습니다.");
            setDialogOpen(false);
          },
          onError: () => toast.error("수정에 실패했습니다."),
        }
      );
    } else {
      createCase.mutate(data, {
        onSuccess: () => {
          toast.success("테스트 항목을 추가했습니다.");
          setDialogOpen(false);
        },
        onError: () => toast.error("추가에 실패했습니다."),
      });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="QA 케이스 뱅크" description="라운드에서 재사용할 QA 테스트 항목을 관리합니다.">
        <Button
          onClick={() => {
            setEditTarget(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          테스트 항목 추가
        </Button>
      </PageHeader>

      <Input
        placeholder="테스트 항목 검색…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-56"
      />

      {isLoading ? (
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
            const l1Cases = Array.from(byL2.values()).flat();
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
                  <span className="text-muted-foreground text-xs tabular-nums">{l1Cases.length}개 항목</span>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-56">테스트 항목</TableHead>
                          <TableHead className="w-64">테스트 절차</TableHead>
                          <TableHead className="w-56">기대 결과</TableHead>
                          <TableHead className="w-24" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(byL2.entries()).map(([l2, l2Cases]) => (
                          <Fragment key={l2 || "__none__"}>
                            {l2 && (
                              <TableRow className="hover:bg-transparent">
                                <td colSpan={4} className="text-muted-foreground bg-muted/30 px-2 py-1.5 text-xs font-semibold">
                                  {l2}
                                </td>
                              </TableRow>
                            )}
                            {l2Cases.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="max-w-56 whitespace-normal align-top">
                                  {c.category_l3 && (
                                    <p className="text-muted-foreground mb-0.5 text-xs">{c.category_l3}</p>
                                  )}
                                  <p className="font-medium">{c.title}</p>
                                </TableCell>
                                <TableCell className="text-muted-foreground max-w-64 whitespace-normal align-top text-xs">
                                  {c.steps}
                                </TableCell>
                                <TableCell className="text-muted-foreground max-w-56 whitespace-normal align-top text-xs">
                                  {c.expected}
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setEditTarget(c);
                                        setDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => setDeleteTarget(c)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
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

      <QaCaseDialog
        key={`${editTarget?.id ?? "new"}-${dialogOpen}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTarget={editTarget}
        categoryL1Options={categoryL1Options}
        categoryL2Options={categoryL2Options}
        onSubmit={handleSubmitCase}
        isPending={createCase.isPending || updateCase.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="테스트 항목 삭제"
        description={`"${deleteTarget?.title}" 항목을 케이스 뱅크에서 삭제합니다. 라운드에서 한 번이라도 사용된 항목은 삭제할 수 없습니다.`}
        variant="destructive"
        confirmLabel="삭제"
        loading={deleteCase.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCase.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("삭제했습니다.");
              setDeleteTarget(null);
            },
            onError: (e) => {
              toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다.");
              setDeleteTarget(null);
            },
          });
        }}
      />
    </div>
  );
}
