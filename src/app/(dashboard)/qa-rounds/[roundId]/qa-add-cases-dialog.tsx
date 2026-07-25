"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QaCasePicker } from "@/components/qa/qa-case-picker";

interface QaAddCasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeIds: Set<string>;
  onSubmit: (caseIds: string[]) => void;
  isPending: boolean;
}

export function QaAddCasesDialog({
  open,
  onOpenChange,
  excludeIds,
  onSubmit,
  isPending,
}: QaAddCasesDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected(new Set());
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>케이스 뱅크에서 이 라운드에 추가</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          <QaCasePicker selected={selected} onChange={setSelected} excludeIds={excludeIds} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            disabled={selected.size === 0 || isPending}
            onClick={() => onSubmit(Array.from(selected))}
          >
            {isPending ? "추가 중..." : `${selected.size}개 추가`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
