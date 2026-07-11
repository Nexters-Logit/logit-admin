"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Tag, Trash2, Zap } from "lucide-react";

type Plan = {
  id: string;
  subscription_type: string;
  plan_key: string;
  name: string;
  original_price: number;
  price: number;
  monthly_tokens: number;
  description: string | null;
  badge: string | null;
  features: string[] | null;
  is_recommended: boolean;
  is_free: boolean;
  is_active: boolean;
  display_order: number;
  show_on_mobile: boolean;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function PlanCard({
  plan,
  onEdit,
  onDelete,
}: {
  plan: Plan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-5 ${plan.is_active ? "bg-white" : "bg-muted/40 opacity-60"}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {plan.subscription_type}
            </span>
            {plan.badge && <Badge className="text-[10px]">{plan.badge}</Badge>}
          </div>
          <h3 className="mt-0.5 text-base font-semibold">{plan.name}</h3>
          <p className="text-[10px] text-muted-foreground">key: {plan.plan_key}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-baseline gap-1.5">
        {plan.original_price > plan.price && (
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(plan.original_price)}원
          </span>
        )}
        <span className="text-xl font-bold">{formatPrice(plan.price)}원</span>
        <span className="text-xs text-muted-foreground">/ 월</span>
      </div>

      <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Zap className="h-3 w-3 text-primary" />
        월 {formatPrice(plan.monthly_tokens)}토큰 제공
      </p>

      {plan.description && (
        <p className="mb-3 text-xs text-muted-foreground">{plan.description}</p>
      )}

      {plan.features && plan.features.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs">
              <Zap className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center gap-2">
        <Badge variant={plan.is_active ? "default" : "secondary"} className="text-[10px]">
          {plan.is_active ? "활성" : "비활성"}
        </Badge>
        {plan.is_recommended && (
          <Badge variant="outline" className="text-[10px]">
            <Tag className="mr-1 h-2.5 w-2.5" />추천
          </Badge>
        )}
        {!plan.show_on_mobile && (
          <Badge variant="secondary" className="text-[10px]">모바일 미노출</Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">순서 {plan.display_order}</span>
      </div>
    </div>
  );
}

type PlanForm = {
  subscription_type: string;
  plan_key: string;
  name: string;
  original_price: string;
  price: string;
  monthly_tokens: string;
  description: string;
  badge: string;
  features: string;
  is_recommended: boolean;
  is_free: boolean;
  is_active: boolean;
  display_order: string;
  show_on_mobile: boolean;
};

const EMPTY_FORM: PlanForm = {
  subscription_type: "logit",
  plan_key: "",
  name: "",
  original_price: "0",
  price: "0",
  monthly_tokens: "0",
  description: "",
  badge: "",
  features: "",
  is_recommended: false,
  is_free: false,
  is_active: true,
  display_order: "0",
  show_on_mobile: true,
};

function PlanFormFields({
  form,
  onChange,
  isCreate,
}: {
  form: PlanForm;
  onChange: (f: PlanForm) => void;
  isCreate: boolean;
}) {
  return (
    <div className="space-y-4 pt-2">
      {isCreate && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>구독 타입</Label>
            <Select
              value={form.subscription_type}
              onValueChange={(v) => onChange({ ...form, subscription_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="logit">logit</SelectItem>
                <SelectItem value="mcp">mcp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>플랜 키 (plan_key)</Label>
            <Input
              value={form.plan_key}
              onChange={(e) => onChange({ ...form, plan_key: e.target.value })}
              placeholder="예: lite, pro, basic"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>이름</Label>
          <Input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>뱃지</Label>
          <Input
            value={form.badge}
            onChange={(e) => onChange({ ...form, badge: e.target.value })}
            placeholder="예: 가장 많이 선택해요"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>정가 (원)</Label>
          <Input
            type="number"
            value={form.original_price}
            onChange={(e) => onChange({ ...form, original_price: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label>할인가 (원)</Label>
          <Input
            type="number"
            value={form.price}
            onChange={(e) => onChange({ ...form, price: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>월 토큰 제공량</Label>
        <Input
          type="number"
          value={form.monthly_tokens}
          onChange={(e) => onChange({ ...form, monthly_tokens: e.target.value })}
          placeholder="예: 400"
        />
      </div>

      <div className="space-y-1">
        <Label>설명</Label>
        <Input
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="짧은 설명"
        />
      </div>

      <div className="space-y-1">
        <Label>기능 목록 (줄바꿈으로 구분)</Label>
        <Textarea
          rows={4}
          value={form.features}
          onChange={(e) => onChange({ ...form, features: e.target.value })}
          placeholder={"기능 1\n기능 2\n기능 3"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>노출 순서</Label>
          <Input
            type="number"
            value={form.display_order}
            onChange={(e) => onChange({ ...form, display_order: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="is_recommended"
            checked={form.is_recommended}
            onCheckedChange={(v) => onChange({ ...form, is_recommended: v })}
          />
          <Label htmlFor="is_recommended">추천</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="is_free"
            checked={form.is_free}
            onCheckedChange={(v) => onChange({ ...form, is_free: v })}
          />
          <Label htmlFor="is_free">무료</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={form.is_active}
            onCheckedChange={(v) => onChange({ ...form, is_active: v })}
          />
          <Label htmlFor="is_active">활성</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show_on_mobile"
            checked={form.show_on_mobile}
            onCheckedChange={(v) => onChange({ ...form, show_on_mobile: v })}
          />
          <Label htmlFor="show_on_mobile">모바일 노출</Label>
        </div>
      </div>
    </div>
  );
}

function formToPayload(form: PlanForm) {
  const featuresArr = form.features
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    subscription_type: form.subscription_type,
    plan_key: form.plan_key,
    name: form.name,
    original_price: Number(form.original_price),
    price: Number(form.price),
    monthly_tokens: Number(form.monthly_tokens),
    description: form.description || null,
    badge: form.badge || null,
    features: featuresArr.length > 0 ? featuresArr : null,
    is_recommended: form.is_recommended,
    is_free: form.is_free,
    is_active: form.is_active,
    display_order: Number(form.display_order),
    show_on_mobile: form.show_on_mobile,
  };
}

export default function PlansPage() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState<PlanForm | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<PlanForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const { data, isLoading } = useQuery<{ data: Plan[] }>({
    queryKey: ["plans"],
    queryFn: async () => {
      const r = await fetch("/api/plans");
      if (!r.ok) throw new Error("Failed to fetch plans");
      return r.json();
    },
  });

  const createPlan = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create plan");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success("요금제가 추가되었습니다.");
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "추가에 실패했습니다."),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const r = await fetch(`/api/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed to update plan");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success("요금제가 업데이트되었습니다.");
      setEditTarget(null);
    },
    onError: () => toast.error("업데이트에 실패했습니다."),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/plans/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete plan");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success("요금제가 삭제되었습니다.");
      setDeleteTarget(null);
    },
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  const openEdit = (plan: Plan) => {
    setEditTarget(plan);
    setEditForm({
      subscription_type: plan.subscription_type,
      plan_key: plan.plan_key,
      name: plan.name,
      original_price: String(plan.original_price),
      price: String(plan.price),
      monthly_tokens: String(plan.monthly_tokens),
      description: plan.description ?? "",
      badge: plan.badge ?? "",
      features: (plan.features ?? []).join("\n"),
      is_recommended: plan.is_recommended,
      is_free: plan.is_free,
      is_active: plan.is_active,
      display_order: String(plan.display_order),
      show_on_mobile: plan.show_on_mobile,
    });
  };

  const plans = data?.data ?? [];
  const logitPlans = plans.filter((p) => p.subscription_type === "logit");
  const mcpPlans = plans.filter((p) => p.subscription_type === "mcp");

  return (
    <div className="space-y-6">
      <PageHeader
        title="요금제 관리"
        description="Logit 및 MCP 요금제 정보를 관리합니다."
      >
        <Button onClick={() => { setCreateForm(EMPTY_FORM); setShowCreate(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          요금제 추가
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Logit 구독 ({logitPlans.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {logitPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={() => openEdit(plan)}
                  onDelete={() => setDeleteTarget(plan)}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              MCP 구독 ({mcpPlans.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mcpPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={() => openEdit(plan)}
                  onDelete={() => setDeleteTarget(plan)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 요금제 추가 다이얼로그 */}
      <Dialog open={showCreate} onOpenChange={(o: boolean) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>요금제 추가</DialogTitle>
          </DialogHeader>
          <PlanFormFields form={createForm} onChange={setCreateForm} isCreate />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              취소
            </Button>
            <Button
              onClick={() => createPlan.mutate(formToPayload(createForm))}
              disabled={createPlan.isPending || !createForm.plan_key || !createForm.name}
            >
              {createPlan.isPending ? "추가 중..." : "추가"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 요금제 수정 다이얼로그 */}
      <Dialog open={!!editTarget} onOpenChange={(o: boolean) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>요금제 수정 — {editTarget?.name}</DialogTitle>
          </DialogHeader>
          {editForm && (
            <>
              <PlanFormFields form={editForm} onChange={setEditForm} isCreate={false} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditTarget(null)}>
                  취소
                </Button>
                <Button
                  onClick={() =>
                    editTarget &&
                    updatePlan.mutate({ id: editTarget.id, data: formToPayload(editForm) })
                  }
                  disabled={updatePlan.isPending}
                >
                  {updatePlan.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>요금제를 삭제하시겠습니까?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{deleteTarget?.name}</strong> ({deleteTarget?.subscription_type}:{deleteTarget?.plan_key}) 요금제를 삭제합니다.
            <br /><br />
            해당 요금제로 활성 구독 중인 유저에게는 영향을 주지 않지만, 이후 신규 구독 시 선택 불가합니다.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deletePlan.mutate(deleteTarget.id)}
              disabled={deletePlan.isPending}
            >
              {deletePlan.isPending ? "삭제 중..." : "삭제"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
