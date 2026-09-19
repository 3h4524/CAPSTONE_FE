"use client";

import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Headphones,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";

import { cn } from "@/utils/cn";

type AdminSidebarProps = {
  activeItem?: string;
  fullName: string;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

const primaryNavigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Users", icon: Users, count: "1.2k" },
  { label: "Subscriptions", icon: CreditCard, href: "/admin/subscription-plans" },
];

const secondaryNavigation = [
  { label: "Revenue & Reports", icon: BarChart3 },
  { label: "Batch Jobs", icon: BriefcaseBusiness, count: "24 active", tone: "amber" },
  { label: "Support Tickets", icon: Headphones, count: "7 open", tone: "rose" },
];

const AdminSidebar = ({
  activeItem = "Dashboard",
  fullName,
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
        "fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:overflow-y-auto",
        isCollapsed ? "w-20" : "w-56",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div
        className={cn(
          "relative flex h-[72px] items-center border-b border-slate-100 px-3.5",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed && <div className="text-base font-bold tracking-tight text-slate-900">APCS</div>}
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-[4px] border border-slate-300 bg-slate-50 text-slate-500 transition hover:bg-slate-100"
          )}
          onClick={onToggleCollapse ?? onClose}
        >
          {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
        </button>
      </div>

      <nav className="flex-1 space-y-7 px-3 py-6">
        <SidebarGroup label="Overview" isCollapsed={isCollapsed}>
          <SidebarItems items={primaryNavigation} activeItem={activeItem} isCollapsed={isCollapsed} />
        </SidebarGroup>
        <SidebarGroup label="Finance & Analytics" isCollapsed={isCollapsed}>
          <SidebarItems items={secondaryNavigation.slice(0, 1)} activeItem={activeItem} isCollapsed={isCollapsed} />
        </SidebarGroup>
        <SidebarGroup label="System" isCollapsed={isCollapsed}>
          <SidebarItems items={secondaryNavigation.slice(1)} activeItem={activeItem} isCollapsed={isCollapsed} />
        </SidebarGroup>
      </nav>

      <div className="border-t border-slate-100 p-4">
        <button
          type="button"
          onClick={onLogout}
          title={isCollapsed ? "Logout" : undefined}
          className={cn(
            "group flex w-full items-center rounded-lg py-2 transition-colors hover:bg-slate-50",
            isCollapsed ? "justify-center px-0" : "gap-3 px-2 text-left"
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
            {getInitials(fullName)}
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{fullName}</p>
                <p className="text-[10px] text-slate-400">Super Admin</p>
              </div>
              <LogOut className="size-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-700" />
            </>
          )}
        </button>
      </div>
    </aside>
  </>
);

const SidebarGroup = ({ label, isCollapsed, children }: { label: string; isCollapsed?: boolean; children: React.ReactNode }) => (
  <div>
    {!isCollapsed && (
      <p className="px-3 pb-2 text-[9px] font-bold tracking-[0.16em] text-slate-400 uppercase">
        {label}
      </p>
    )}
    {children}
  </div>
);

const SidebarItems = ({
  items,
  activeItem,
  isCollapsed,
}: {
  items: Array<{ label: string; icon: typeof Users; count?: string; tone?: string; href?: string }>;
  activeItem: string;
  isCollapsed?: boolean;
}) => (
  <div className="space-y-0.5">
    {items.map(({ label, icon: Icon, count, tone, href }) => {
      const active = label === activeItem;
      const className = cn(
        "flex w-full items-center rounded-md py-2.5 text-left text-xs transition-colors",
        isCollapsed ? "justify-center px-0" : "gap-3 px-3",
        active
          ? "bg-slate-100 font-semibold text-slate-900"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      );
      const content = (
        <>
          <Icon
            className={cn("size-3.5 shrink-0", active ? "text-slate-700" : "text-slate-400")}
            strokeWidth={1.8}
          />
          {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
          {!isCollapsed && count && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                tone === "amber" && "bg-amber-50 text-amber-600",
                tone === "rose" && "bg-rose-50 text-rose-500",
                !tone && "bg-slate-100 text-slate-400"
              )}
            >
              {count}
            </span>
          )}
        </>
      );

      if (href) {
        return (
          <Link key={label} href={href} title={isCollapsed ? label : undefined} className={className}>
            {content}
          </Link>
        );
      }

      return (
        <button type="button" key={label} title={isCollapsed ? label : undefined} className={className}>
          {content}
        </button>
      );
    })}
  </div>
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
