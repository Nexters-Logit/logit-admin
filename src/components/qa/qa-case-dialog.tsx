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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QaTestCase, QaTestCaseFormData } from "@/hooks/use-qa-cases";

const EMPTY_FORM: QaTestCaseFormData = {
  category_l1: "",
  category_l2: "",
  category_l3: "",
  title: "",
  steps: "",
  expected: "",
};

interface QaCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: QaTestCase | null;
  categoryL1Options: string[];
  categoryL2Options: string[];
  onSubmit: (data: QaTestCaseFormData) => void;
  isPending: boolean;
}

export function QaCaseDialog({
  open,
  onOpenChange,
  editTarget,
  categoryL1Options,
  categoryL2Options,
  onSubmit,
  isPending,
}: QaCaseDialogProps) {
  const [form, setForm] = useState<QaTestCaseFormData>(() =>
    editTarget
      ? {
          category_l1: editTarget.category_l1,
          category_l2: editTarget.category_l2 ?? "",
          category_l3: editTarget.category_l3 ?? "",
          title: editTarget.title,
          steps: editTarget.steps,
          expected: editTarget.expected,
        }
      : EMPTY_FORM
  );

  const canSubmit =
    form.category_l1.trim() && form.title.trim() && form.steps.trim() && form.expected.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editTarget ? "테스트 항목 수정" : "테스트 항목 추가"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category_l1">대분류 *</Label>
              <Input
                id="category_l1"
                list="category-l1-options"
                placeholder="예: 채팅"
                value={form.category_l1}
                onChange={(e) => setForm((f) => ({ ...f, category_l1: e.target.value }))}
              />
              <datalist id="category-l1-options">
                {categoryL1Options.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category_l2">중분류</Label>
              <Input
                id="category_l2"
                list="category-l2-options"
                placeholder="예: 입력창"
                value={form.category_l2}
                onChange={(e) => setForm((f) => ({ ...f, category_l2: e.target.value }))}
              />
              <datalist id="category-l2-options">
                {categoryL2Options.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category_l3">소분류</Label>
              <Input
                id="category_l3"
                placeholder="예: 전송 단축키"
                value={form.category_l3}
                onChange={(e) => setForm((f) => ({ ...f, category_l3: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">테스트 항목 *</Label>
            <Input
              id="title"
              placeholder="예: Enter로 전송"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="steps">테스트 절차 *</Label>
            <Textarea
              id="steps"
              rows={2}
              placeholder="어떻게 테스트할지 구체적으로 작성"
              value={form.steps}
              onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expected">기대 결과 *</Label>
            <Textarea
              id="expected"
              rows={2}
              placeholder="정상 동작이라면 어떻게 보여야 하는지"
              value={form.expected}
              onChange={(e) => setForm((f) => ({ ...f, expected: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={!canSubmit || isPending} onClick={() => onSubmit(form)}>
            {isPending ? "저장 중..." : editTarget ? "수정" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
