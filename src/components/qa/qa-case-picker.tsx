"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useQaCases, useCreateQaCase } from "@/hooks/use-qa-cases";
import { QaCaseDialog } from "@/components/qa/qa-case-dialog";
import { Plus } from "lucide-react";

interface QaCasePickerProps {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** 이미 다른 목록(예: 현재 라운드)에 포함되어 더 고를 필요 없는 케이스 id들 */
  excludeIds?: Set<string>;
}

export function QaCasePicker({ selected, onChange, excludeIds }: QaCasePickerProps) {
  const { data: cases = [] } = useQaCases();
  const createCase = useCreateQaCase();
  const [search, setSearch] = useState("");
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);

  const available = useMemo(
    () => (excludeIds ? cases.filter((c) => !excludeIds.has(c.id)) : cases),
    [cases, excludeIds]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return available;
    return available.filter((c) =>
      `${c.title} ${c.category_l1} ${c.category_l2 ?? ""} ${c.category_l3 ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [available, search]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const handleCreateCase = (data: Parameters<typeof createCase.mutate>[0]) => {
    createCase.mutate(data, {
      onSuccess: (created) => {
        onChange(new Set(selected).add(created.id));
        toast.success("테스트 항목을 추가했습니다.");
        setCaseDialogOpen(false);
      },
      onError: () => toast.error("추가에 실패했습니다."),
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">케이스 뱅크에서 선택 ({selected.size}개 선택됨)</p>
        <Button type="button" size="sm" variant="outline" onClick={() => setCaseDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          새 항목 추가
        </Button>
      </div>
      <Input placeholder="검색…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground p-2 text-sm">항목이 없습니다.</p>
        ) : (
          filtered.map((c) => (
            <label
              key={c.id}
              className="hover:bg-muted/50 flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm"
            >
              <Checkbox
                checked={selected.has(c.id)}
                onCheckedChange={() => toggle(c.id)}
                className="mt-0.5"
              />
              <span>
                <span className="text-muted-foreground text-xs">
                  {[c.category_l1, c.category_l2, c.category_l3].filter(Boolean).join(" › ")}
                </span>
                <br />
                {c.title}
              </span>
            </label>
          ))
        )}
      </div>

      <QaCaseDialog
        key={`new-${caseDialogOpen}`}
        open={caseDialogOpen}
        onOpenChange={setCaseDialogOpen}
        editTarget={null}
        categoryL1Options={Array.from(new Set(cases.map((c) => c.category_l1))).sort()}
        categoryL2Options={Array.from(
          new Set(cases.map((c) => c.category_l2).filter((v): v is string => !!v))
        ).sort()}
        onSubmit={handleCreateCase}
        isPending={createCase.isPending}
      />
    </div>
  );
}
