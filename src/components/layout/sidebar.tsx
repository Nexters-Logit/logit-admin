"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  BookOpen,
  Database,
  Image as ImageIcon,
  ChevronLeft,
  CreditCard,
  Package,
  BadgeCheck,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navGroups = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
      { href: "/users", label: "사용자", icon: Users },
      { href: "/projects", label: "프로젝트", icon: FolderKanban },
      { href: "/experiences", label: "경험", icon: BookOpen },
      { href: "/banners", label: "배너", icon: ImageIcon },
    ],
  },
  {
    label: "결제",
    items: [
      { href: "/plans", label: "요금제 관리", icon: Package },
      { href: "/payments", label: "결제 관리", icon: CreditCard },
      { href: "/subscriptions", label: "구독 현황", icon: BadgeCheck },
      { href: "/subscription-logs", label: "이벤트 로그", icon: ScrollText },
    ],
  },
  {
    label: null,
    items: [
      { href: "/database", label: "데이터베이스", icon: Database },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link
          href="/dashboard"
          className={cn("flex items-center gap-2", collapsed && "hidden")}
        >
          <Image
            src="/logo_splash.svg"
            alt="Logit"
            width={80}
            height={24}
            className="h-6 w-auto"
          />
          <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
            Admin
          </span>
        </Link>
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <Image
              src="/Subtract.svg"
              alt="Logit"
              width={24}
              height={24}
              className="h-6 w-6"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 shrink-0"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <Separator className="my-2" />}
            {group.label && !collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
