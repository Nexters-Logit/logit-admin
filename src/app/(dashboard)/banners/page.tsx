"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useBanners,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
  useReorderBanners,
  useBannerCompare,
  useDeployBanners,
  type Banner,
  type BannerFormData,
} from "@/hooks/use-banners";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GripVertical, MoreHorizontal, Plus, Upload, RefreshCw, Rocket } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const DEFAULT_FORM: BannerFormData = {
  image_url: "",
  link_url: "",
  is_visible: true,
  display_order: 0,
};

function useServerEnv() {
  return useQuery<{ env: "dev" | "production"; prodConfigured: boolean }>({
    queryKey: ["server-env"],
    queryFn: async () => {
      const res = await fetch("/api/env");
      return res.json();
    },
  });
}

function SortableBannerRow({
  banner,
  index,
  onEdit,
  onDelete,
  onToggleVisible,
}: {
  banner: Banner;
  index: number;
  onEdit: (b: Banner) => void;
  onDelete: (id: number) => void;
  onToggleVisible: (id: number, visible: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <span className="w-5 text-center text-sm font-medium text-muted-foreground">
        {index}
      </span>

      <img
        src={banner.image_url}
        alt="배너"
        className="h-14 w-28 flex-shrink-0 rounded-lg object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      <div className="min-w-0 flex-1">
        {banner.link_url ? (
          <a
            href={banner.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm text-blue-600 hover:underline"
          >
            {banner.link_url}
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">링크 없음</span>
        )}
      </div>

      <Switch
        checked={banner.is_visible}
        onCheckedChange={(checked) => onToggleVisible(banner.id, checked)}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(banner)}>수정</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(banner.id)}
          >
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DevOnlyBannerRow({
  banner,
  onDeploy,
  isDeploying,
}: {
  banner: Banner;
  onDeploy: (id: number) => void;
  isDeploying: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 opacity-60">
      <span className="w-5 text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </span>
      <span className="w-5" />

      <img
        src={banner.image_url}
        alt="배너"
        className="h-14 w-28 flex-shrink-0 rounded-lg object-cover grayscale"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted-foreground">
          {banner.link_url ?? "링크 없음"}
        </p>
        <Badge variant="outline" className="mt-1 text-xs">
          배포 대기 중
        </Badge>
      </div>

      <Button
        size="sm"
        variant="outline"
        disabled={isDeploying}
        onClick={() => onDeploy(banner.id)}
        className="flex-shrink-0 gap-1.5"
      >
        <Rocket className="h-3.5 w-3.5" />
        배포
      </Button>
    </div>
  );
}

export default function BannersPage() {
  const { data: envData } = useServerEnv();
  const currentEnv = envData?.env ?? "dev";
  const prodConfigured = envData?.prodConfigured ?? false;

  const { data: banners, isLoading } = useBanners();
  const { data: compareData } = useBannerCompare();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const reorderBanners = useReorderBanners();
  const deployBanners = useDeployBanners();

  const [localBanners, setLocalBanners] = useState<Banner[] | null>(null);
  const displayBanners = localBanners ?? banners ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormData>(DEFAULT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const devOnlyBanners = compareData?.devOnlyBanners ?? [];
  const unsynced = currentEnv === "dev" ? devOnlyBanners.length : 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = displayBanners.findIndex((b) => b.id === active.id);
    const newIndex = displayBanners.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(displayBanners, oldIndex, newIndex);

    setLocalBanners(reordered);
    reorderBanners.mutate(reordered.map((b) => b.id), {
      onSuccess: () => setLocalBanners(null),
      onError: () => {
        setLocalBanners(null);
        toast.error("순서 변경에 실패했습니다.");
      },
    });
  };

  const handleSyncAll = () => {
    const ids = devOnlyBanners.map((b) => b.id);
    if (ids.length === 0) {
      toast.info("동기화할 배너가 없습니다.");
      return;
    }
    deployBanners.mutate(ids, {
      onSuccess: ({ deployed, skipped }) => {
        toast.success(`${deployed}개 배너를 프로덕션에 동기화했습니다.${skipped > 0 ? ` (${skipped}개 중복 건너뜀)` : ""}`);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleDeploy = (id: number) => {
    deployBanners.mutate([id], {
      onSuccess: ({ deployed }) => {
        if (deployed > 0) toast.success("배너를 프로덕션에 배포했습니다.");
        else toast.info("이미 프로덕션에 배포된 배너입니다.");
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditTarget(banner);
    setForm({
      image_url: banner.image_url,
      link_url: banner.link_url ?? "",
      is_visible: banner.is_visible,
      display_order: banner.display_order,
    });
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "업로드에 실패했습니다.");
        return;
      }
      const { url } = await res.json();
      setForm((f) => ({ ...f, image_url: url }));
    } catch {
      toast.error("업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!form.image_url.trim()) {
      toast.error("이미지를 업로드해 주세요.");
      return;
    }
    if (editTarget) {
      updateBanner.mutate({ id: editTarget.id, ...form }, {
        onSuccess: () => { toast.success("배너를 수정했습니다."); setDialogOpen(false); },
        onError: () => toast.error("수정에 실패했습니다."),
      });
    } else {
      createBanner.mutate({ ...form, display_order: displayBanners.length }, {
        onSuccess: () => { toast.success("배너를 추가했습니다."); setDialogOpen(false); },
        onError: () => toast.error("추가에 실패했습니다."),
      });
    }
  };

  const isPending = createBanner.isPending || updateBanner.isPending || isUploading;

  return (
    <div className="space-y-4">
      <PageHeader
        title="배너 관리"
        description={
          currentEnv === "dev"
            ? "드래그해서 순서 조정 · Dev 환경"
            : "드래그해서 순서 조정 · Production 환경"
        }
      >
        {currentEnv === "dev" && prodConfigured && (
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={deployBanners.isPending}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            전체 동기화
            {unsynced > 0 && (
              <Badge className="ml-1 h-5 px-1.5">{unsynced}</Badge>
            )}
          </Button>
        )}
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          배너 추가
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 운영 중인 배너 */}
          {displayBanners.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              등록된 배너가 없습니다.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 px-4 text-xs font-medium text-muted-foreground">
                <span className="w-5" />
                <span className="w-5 text-center">순서</span>
                <span className="w-28">미리보기</span>
                <span className="flex-1">링크</span>
                <span>노출</span>
                <span className="w-8" />
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayBanners.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {displayBanners.map((banner, index) => (
                      <SortableBannerRow
                        key={banner.id}
                        banner={banner}
                        index={index}
                        onEdit={openEdit}
                        onDelete={(id) => setDeleteTarget(id)}
                        onToggleVisible={(id, checked) =>
                          updateBanner.mutate(
                            { id, is_visible: checked },
                            { onError: () => toast.error("변경에 실패했습니다.") }
                          )
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}

          {/* Prod 뷰: 배포 대기 중인 Dev 배너 */}
          {currentEnv === "production" && prodConfigured && devOnlyBanners.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                배포 대기 중 ({devOnlyBanners.length}개)
              </p>
              <div className="space-y-2">
                {devOnlyBanners.map((banner) => (
                  <DevOnlyBannerRow
                    key={banner.id}
                    banner={banner}
                    onDeploy={handleDeploy}
                    isDeploying={deployBanners.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 배너 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "배너 수정" : "배너 추가"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>이미지 *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {form.image_url ? (
                <div className="relative">
                  <img
                    src={form.image_url}
                    alt="미리보기"
                    className="h-36 w-full rounded-lg object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    교체
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:text-foreground disabled:opacity-50"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">
                    {isUploading ? "업로드 중..." : "클릭하여 이미지 업로드"}
                  </span>
                  <span className="text-xs">JPG, PNG, WebP, GIF · 최대 5MB</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="link_url">링크 URL</Label>
              <Input
                id="link_url"
                placeholder="https://example.com"
                value={form.link_url}
                onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is_visible"
                checked={form.is_visible}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, is_visible: checked }))}
              />
              <Label htmlFor="is_visible">노출 여부</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isUploading ? "업로드 중..." : isPending ? "저장 중..." : editTarget ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
        title="배너 삭제"
        description="이 배너를 영구 삭제하시겠습니까?"
        confirmLabel="삭제"
        variant="destructive"
        loading={deleteBanner.isPending}
        onConfirm={() => {
          if (deleteTarget !== null) {
            deleteBanner.mutate(deleteTarget, {
              onSuccess: () => { toast.success("배너를 삭제했습니다."); setDeleteTarget(null); },
              onError: () => toast.error("삭제에 실패했습니다."),
            });
          }
        }}
      />
    </div>
  );
}
