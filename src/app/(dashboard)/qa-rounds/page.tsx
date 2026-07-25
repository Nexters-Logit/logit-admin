"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useQaRounds,
  useCreateQaRound,
  type QaRoundFormData,
} from "@/hooks/use-qa-rounds";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { computeQaStats } from "@/lib/qa-stats";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { QaRoundCreateDialog } from "./qa-round-create-dialog";
import { cn } from "@/lib/utils";

export default function QaRoundsPage() {
  const { data: rounds, isLoading } = useQaRounds();
  const { data: admins = [] } = useAdminUsers();
  const createRound = useCreateQaRound();
  const [dialogOpen, setDialogOpen] = useState(false);

  const adminName = (email: string | null) =>
    admins.find((a) => a.email === email)?.name ?? email ?? "—";

  const handleCreate = (data: QaRoundFormData) => {
    createRound.mutate(data, {
      onSuccess: () => {
        toast.success("새 라운드를 만들었습니다.");
        setDialogOpen(false);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "라운드 생성에 실패했습니다."),
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader title="QA 라운드" description="라운드별 QA 진행 이력을 관리합니다.">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          새 라운드 만들기
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : !rounds || rounds.length === 0 ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center rounded-xl border border-dashed text-sm">
          아직 만들어진 라운드가 없습니다. &quot;새 라운드 만들기&quot;로 시작해보세요.
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => {
            const stats = computeQaStats(round.items);
            return (
              <Link
                key={round.id}
                href={`/qa-rounds/${round.id}`}
                className="hover:bg-muted/50 block rounded-lg border p-4 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{round.name}</span>
                    <Badge variant={round.status === "closed" ? "secondary" : "default"}>
                      {round.status === "closed" ? "종료" : "진행 중"}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {adminName(round.created_by)} · {format(new Date(round.created_at), "yyyy-MM-dd")}
                  </span>
                </div>
                {round.description && (
                  <p className="text-muted-foreground mt-1 text-sm">{round.description}</p>
                )}
                <div className="mt-3 grid grid-cols-5 gap-3">
                  {[
                    { label: "전체 항목", value: stats.total, color: "text-foreground" },
                    { label: "Pass", value: stats.pass, color: "text-emerald-600" },
                    { label: "Fail", value: stats.fail, color: "text-red-600" },
                    { label: "보류", value: stats.blocked, color: "text-amber-500" },
                    { label: "진행률", value: `${stats.progress}%`, color: "text-foreground" },
                  ].map((tile) => (
                    <div key={tile.label} className="rounded-md border p-2">
                      <p className={cn("text-lg font-bold tabular-nums", tile.color)}>{tile.value}</p>
                      <p className="text-muted-foreground text-xs">{tile.label}</p>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <QaRoundCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isPending={createRound.isPending}
      />

    </div>
  );
}
