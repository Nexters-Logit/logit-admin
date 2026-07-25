"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQaRounds, type QaRoundFormData } from "@/hooks/use-qa-rounds";
import { useQaRoundItems } from "@/hooks/use-qa-round-items";
import { QaCasePicker } from "@/components/qa/qa-case-picker";

interface QaRoundCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: QaRoundFormData) => void;
  isPending: boolean;
}

export function QaRoundCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: QaRoundCreateDialogProps) {
  const { data: rounds = [] } = useQaRounds();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sourceRoundId, setSourceRoundId] = useState<string>("__none__");

  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [rounds]
  );

  const { data: sourceItems = [] } = useQaRoundItems(
    sourceRoundId !== "__none__" ? sourceRoundId : undefined
  );

  const importFromSource = (onlyFail: boolean) => {
    const ids = sourceItems
      .filter((i) => !onlyFail || i.status === "fail")
      .map((i) => i.case_id);
    if (ids.length === 0) {
      toast.info(onlyFail ? "직전 라운드에 Fail 항목이 없습니다." : "가져올 항목이 없습니다.");
      return;
    }
    setSelected((prev) => new Set([...prev, ...ids]));
    toast.success(`${ids.length}개 항목을 담았습니다.`);
  };

  const handleSubmit = () => {
    onSubmit({
      name,
      description: description || undefined,
      sourceCaseIds: Array.from(selected),
    });
  };

  const reset = () => {
    setName("");
    setDescription("");
    setSelected(new Set());
    setSourceRoundId("__none__");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>새 라운드 만들기</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="round-name">라운드 이름 *</Label>
              <Input
                id="round-name"
                placeholder="예: v1.1 핫픽스 QA"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="round-description">설명</Label>
              <Input
                id="round-description"
                placeholder="선택 입력"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">이전 라운드에서 가져오기</p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={sourceRoundId} onValueChange={setSourceRoundId}>
                <SelectTrigger size="sm" className="w-48">
                  <SelectValue placeholder="소스 라운드 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">선택 안 함</SelectItem>
                  {sortedRounds.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sourceRoundId === "__none__"}
                onClick={() => importFromSource(true)}
              >
                Fail만 담기
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={sourceRoundId === "__none__"}
                onClick={() => importFromSource(false)}
              >
                전체 담기
              </Button>
            </div>
          </div>

          <QaCasePicker selected={selected} onChange={setSelected} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={!name.trim() || isPending} onClick={handleSubmit}>
            {isPending ? "만드는 중..." : "라운드 만들기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
