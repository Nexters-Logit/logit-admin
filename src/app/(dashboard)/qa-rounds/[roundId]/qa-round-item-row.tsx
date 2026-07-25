"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QaRoundItem } from "@/hooks/use-qa-round-items";
import { useUpdateQaRoundItem } from "@/hooks/use-qa-round-items";
import type { AdminUser } from "@/hooks/use-admin-users";
import { ChevronDown, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pass: { label: "Pass", className: "bg-emerald-600 text-white border-emerald-600" },
  fail: { label: "Fail", className: "bg-red-600 text-white border-red-600" },
  blocked: { label: "보류", className: "bg-amber-500 text-white border-amber-500" },
} as const;

interface QaRoundItemRowProps {
  item: QaRoundItem;
  roundId: string;
  roundClosed: boolean;
  testers: AdminUser[];
  expanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
}

export function QaRoundItemRow({
  item,
  roundId,
  roundClosed,
  testers,
  expanded,
  onToggleExpand,
  onRemove,
}: QaRoundItemRowProps) {
  const updateItem = useUpdateQaRoundItem(roundId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [title, setTitle] = useState(item.title);
  const [steps, setSteps] = useState(item.steps);
  const [expected, setExpected] = useState(item.expected);
  const [device, setDevice] = useState(item.device ?? "");
  const [situation, setSituation] = useState(item.situation ?? "");
  const [detail, setDetail] = useState(item.detail ?? "");

  useEffect(() => {
    setTitle(item.title);
    setSteps(item.steps);
    setExpected(item.expected);
    setDevice(item.device ?? "");
    setSituation(item.situation ?? "");
    setDetail(item.detail ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.case_id]);

  const patch = (data: Parameters<typeof updateItem.mutate>[0]["patch"]) => {
    updateItem.mutate(
      { caseId: item.case_id, patch: data },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.") }
    );
  };

  const handleStatusClick = (status: "pass" | "fail" | "blocked") => {
    if (roundClosed) return;
    patch({ status: item.status === status ? null : status });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "qa-sheet");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "업로드에 실패했습니다.");
        return;
      }
      const { url } = await res.json();
      patch({ screenshot_url: url });
    } catch {
      toast.error("업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const breadcrumb = [item.category_l2, item.category_l3].filter(Boolean).join(" › ");

  return (
    <>
      <TableRow>
        <TableCell className="max-w-56 whitespace-normal align-top">
          {breadcrumb && <p className="text-muted-foreground mb-0.5 text-xs">{breadcrumb}</p>}
          <p className="font-medium">{item.title}</p>
        </TableCell>
        <TableCell className="text-muted-foreground max-w-64 whitespace-normal align-top text-xs">
          {item.steps}
        </TableCell>
        <TableCell className="text-muted-foreground max-w-56 whitespace-normal align-top text-xs">
          {item.expected}
        </TableCell>
        <TableCell className="align-top">
          <Select
            value={item.tester_email ?? "__none__"}
            onValueChange={(v) => patch({ tester_email: v === "__none__" ? null : v })}
            disabled={roundClosed}
          >
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="미배정" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">미배정</SelectItem>
              {testers.map((t) => (
                <SelectItem key={t.email} value={t.email}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="align-top">
          <div className="inline-flex overflow-hidden rounded-md border">
            {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((s) => (
              <button
                key={s}
                type="button"
                disabled={roundClosed}
                onClick={() => handleStatusClick(s)}
                className={cn(
                  "border-r px-2 py-1 text-xs font-medium last:border-r-0 disabled:cursor-not-allowed disabled:opacity-60",
                  item.status === s
                    ? STATUS_CONFIG[s].className
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </TableCell>
        <TableCell className="align-top">
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggleExpand}>
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={roundClosed}
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 space-y-1.5">
                <label className="text-xs font-medium">테스트 항목 (이 라운드에서만 수정됩니다)</label>
                <Input
                  value={title}
                  disabled={roundClosed}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => title.trim() && title !== item.title && patch({ title: title.trim() })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">테스트 절차</label>
                <Textarea
                  rows={2}
                  value={steps}
                  disabled={roundClosed}
                  onChange={(e) => setSteps(e.target.value)}
                  onBlur={() => steps.trim() && steps !== item.steps && patch({ steps: steps.trim() })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">기대 결과</label>
                <Textarea
                  rows={2}
                  value={expected}
                  disabled={roundClosed}
                  onChange={(e) => setExpected(e.target.value)}
                  onBlur={() =>
                    expected.trim() && expected !== item.expected && patch({ expected: expected.trim() })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">발생 디바이스 / 환경</label>
                <Input
                  value={device}
                  disabled={roundClosed}
                  onChange={(e) => setDevice(e.target.value)}
                  onBlur={() => patch({ device })}
                  placeholder="예: iPhone 15 Pro · Safari 17"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">발생 상황</label>
                <Input
                  value={situation}
                  disabled={roundClosed}
                  onChange={(e) => setSituation(e.target.value)}
                  onBlur={() => patch({ situation })}
                  placeholder="예: 문항 삭제 시도 중"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">스크린샷</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {item.screenshot_url ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={item.screenshot_url}
                      alt="스크린샷"
                      className="h-9 w-9 rounded object-cover"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isUploading || roundClosed}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? "업로드 중..." : "교체"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isUploading || roundClosed}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {isUploading ? "업로드 중..." : "업로드"}
                  </Button>
                )}
              </div>
              <div className="col-span-3 space-y-1.5">
                <label className="text-xs font-medium">상세 내용</label>
                <Textarea
                  rows={2}
                  value={detail}
                  disabled={roundClosed}
                  onChange={(e) => setDetail(e.target.value)}
                  onBlur={() => patch({ detail })}
                  placeholder="증상, 재현 절차, 기대와 다른 점 등을 자세히 작성해주세요"
                />
              </div>
              <div className="col-span-3 flex items-center justify-between border-t border-dashed pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={item.confirmed}
                    disabled={roundClosed}
                    onCheckedChange={(checked) => patch({ confirmed: checked === true })}
                  />
                  담당자 확인 완료
                </label>
                {item.updated_by && (
                  <span className="text-muted-foreground text-xs">
                    마지막 수정: {item.updated_by}
                  </span>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
