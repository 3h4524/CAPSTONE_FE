"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
} from "lucide-react";

import { Logo } from "@/components/commons/icons/logo";
import { NavSection } from "@/components/commons/layout/app-shell/sidebar/nav-section";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ADMIN_NAV_SECTIONS } from "@/constants/navigation";
import { cn } from "@/utils/cn";

type AdminSidebarProps = {
  fullName: string;
  email: string;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

const AdminSidebar = ({
  fullName,
  email,
  onLogout,
  isMobileOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) => (
  <>
    {isMobileOpen && (
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-950/20 lg:hidden"
      />
    )}
    <aside
      className={cn(
        "border-ink-200 bg-card dark:lg:bg-background fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col overflow-hidden border-r transition-all duration-200 max-md:right-0 max-md:left-auto max-md:border-r-0 max-md:border-l lg:sticky lg:top-0 lg:z-auto lg:h-dvh dark:lg:border-r-0",
        isCollapsed ? "w-20" : "w-56",
        // On a phone it comes from the right, the side of the More tab that opens it.
        isMobileOpen ? "translate-x-0" : "-translate-x-full max-md:translate-x-full lg:translate-x-0"
      )}
    >
      <div
        className={cn(
          "border-ink-100 relative flex h-[72px] items-center border-b px-3.5",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed && (
          <div className="text-ink-900 flex items-center gap-2 text-base font-bold tracking-tight">
            <span aria-hidden="true" className="flex shrink-0">
              <Logo height={30} width={30} />
            </span>
            Podivo
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="text-ink-500 hover:text-ink-900 size-8"
          onClick={onToggleCollapse ?? onClose}
        >
          {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      <nav aria-label="Admin navigation" className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-6">
        {ADMIN_NAV_SECTIONS.map((section, index) => (
          <Fragment key={section.label}>
            {index > 0 && <Separator />}
            <NavSection section={section} collapsed={isCollapsed} />
          </Fragment>
        ))}
      </nav>

      <div className="border-ink-100 border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={isCollapsed ? "Profile" : undefined}
              className={cn(
                "group hover:bg-ink-50 flex w-full items-center rounded-lg py-2 transition-colors focus:outline-none",
                isCollapsed ? "justify-center px-0" : "gap-3 px-2 text-left"
              )}
            >
              <div className="bg-ink-900 text-card flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                {getInitials(fullName)}
              </div>
              {!isCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink-800 truncate text-xs font-semibold">{fullName}</p>
                    <p className="text-ink-500 truncate text-[10px]">{email}</p>
                  </div>
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm leading-none font-medium">{fullName}</p>
                <p className="text-ink-500 text-xs leading-none">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/profile">
                <User className="mr-2 size-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 size-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 size-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  </>
);

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export { AdminSidebar };
