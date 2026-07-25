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
import { parseCsv, toCsv } from "@/lib/csv";
import { Download } from "lucide-react";

const HEADER = ["대분류", "중분류", "소분류", "테스트 항목", "테스트 절차", "기대 결과"];

export interface QaCsvImportRow {
  category_l1: string;
  category_l2: string;
  category_l3: string;
  title: string;
  steps: string;
  expected: string;
}

interface QaCsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rows: QaCsvImportRow[]) => void;
  isPending: boolean;
}

export function QaCsvImportDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: QaCsvImportDialogProps) {
  const [rows, setRows] = useState<QaCsvImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    const [, ...body] = parsed;
    const mapped = body
      .map((r) => ({
        category_l1: r[0]?.trim() ?? "",
        category_l2: r[1]?.trim() ?? "",
        category_l3: r[2]?.trim() ?? "",
        title: r[3]?.trim() ?? "",
        steps: r[4]?.trim() ?? "",
        expected: r[5]?.trim() ?? "",
      }))
      .filter((r) => r.category_l1 || r.title || r.steps || r.expected);
    const invalid = mapped.filter((r) => !r.category_l1 || !r.title || !r.steps || !r.expected);

    setFileName(file.name);
    if (invalid.length > 0) {
      setRows([]);
      setParseError(
        `${invalid.length}개 행에 필수값(대분류/테스트 항목/절차/기대 결과)이 비어 있습니다. 파일을 확인해주세요.`
      );
    } else {
      setRows(mapped);
      setParseError(null);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = toCsv([
      HEADER,
      [
        "로그인·인증",
        "OAuth 로그인",
        "Google",
        "Google 로그인 버튼",
        "로그인 페이지에서 「Google로 계속하기」 클릭",
        "Google OAuth 동의 화면으로 정상 리다이렉트된다",
      ],
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "qa-import-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const reset = () => {
    setRows([]);
    setFileName("");
    setParseError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>CSV로 가져오기</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-muted-foreground text-sm">
            열 순서: 대분류, 중분류, 소분류, 테스트 항목, 테스트 절차, 기대 결과 (첫 줄은 헤더로
            간주해 건너뜁니다). 이미 케이스 뱅크에 같은 대분류/중분류/소분류/테스트 항목이 있으면
            새로 만들지 않고 재사용해서 이 라운드에 담습니다.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            템플릿 다운로드
          </Button>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="text-sm"
          />
          {parseError && <p className="text-sm text-red-600">{parseError}</p>}
          {!parseError && fileName && (
            <p className="text-sm">
              <span className="font-medium">{fileName}</span> — {rows.length}개 항목 인식됨
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={rows.length === 0 || isPending} onClick={() => onSubmit(rows)}>
            {isPending ? "가져오는 중..." : `${rows.length}개 가져오기`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
