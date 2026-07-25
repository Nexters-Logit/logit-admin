"use client";

import { useState } from "react";
import { useAdminUsers, useUpdateAdminUserName, type AdminUser } from "@/hooks/use-admin-users";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAdminUsers();
  const updateName = useUpdateAdminUserName();
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const startEdit = (user: AdminUser) => {
    setEditingEmail(user.email);
    setDraftName(user.name);
  };

  const cancelEdit = () => {
    setEditingEmail(null);
    setDraftName("");
  };

  const saveEdit = (email: string) => {
    if (!draftName.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    updateName.mutate(
      { email, name: draftName.trim() },
      {
        onSuccess: () => {
          toast.success("이름을 수정했습니다.");
          cancelEdit();
        },
        onError: () => toast.error("수정에 실패했습니다."),
      }
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="관리자 관리"
        description="로그인이 허용된 이메일 목록과, QA 테스트 시트 등에서 쓰일 표시 이름을 관리합니다. 이메일 자체는 ADMIN_ALLOWED_EMAILS 설정을 따르며 여기서는 이름만 수정할 수 있습니다."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이메일</TableHead>
              <TableHead>이름</TableHead>
              <TableHead className="w-24 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                  ADMIN_ALLOWED_EMAILS에 설정된 이메일이 없습니다.
                </TableCell>
              </TableRow>
            )}

            {users?.map((user) => {
              const isEditing = editingEmail === user.email;
              return (
                <TableRow key={user.email}>
                  <TableCell className="font-mono text-xs">{user.email}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(user.email);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-8 max-w-48"
                      />
                    ) : (
                      user.name
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={updateName.isPending}
                          onClick={() => saveEdit(user.email)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={updateName.isPending}
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEdit(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
