"use client";

import {
  BarChart3,
  BriefcaseBusiness,
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
};

const primaryNavigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Users", icon: Users, count: "1.2k" },
  { label: "Subscriptions", icon: CreditCard },
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
        "fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:z-auto lg:flex",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex h-[72px] items-center gap-2 border-b border-slate-100 px-6">
        <div className="flex size-7 items-center justify-center rounded-md bg-slate-950 text-[11px] font-bold text-white">
          A
        </div>
        <span className="font-display text-sm font-bold tracking-tight text-slate-900">APCS</span>
        <span className="ml-auto rounded bg-slate-100 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-7 px-3 py-6">
        <SidebarGroup label="Overview">
          <SidebarItems items={primaryNavigation} activeItem={activeItem} />
        </SidebarGroup>
        <SidebarGroup label="Finance & Analytics">
          <SidebarItems items={secondaryNavigation.slice(0, 1)} activeItem={activeItem} />
        </SidebarGroup>
        <SidebarGroup label="System">
          <SidebarItems items={secondaryNavigation.slice(1)} activeItem={activeItem} />
        </SidebarGroup>
      </nav>

      <div className="border-t border-slate-100 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
            {getInitials(fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">{fullName}</p>
            <p className="text-[10px] text-slate-400">Super Admin</p>
          </div>
          <LogOut className="size-3.5 text-slate-300 transition-colors group-hover:text-slate-700" />
        </button>
      </div>
    </aside>
  </>
);

const SidebarGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    {children}
  </div>
);

const SidebarItems = ({
  items,
  activeItem,
}: {
  items: Array<{ label: string; icon: typeof Users; count?: string; tone?: string }>;
  activeItem: string;
}) => (
  <div className="space-y-0.5">
    {items.map(({ label, icon: Icon, count, tone }) => {
      const active = label === activeItem;
      return (
        <button
          type="button"
          key={label}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs transition-colors",
            active
              ? "bg-slate-100 font-semibold text-slate-900"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Icon
            className={cn("size-3.5", active ? "text-slate-700" : "text-slate-400")}
            strokeWidth={1.8}
          />
          <span className="flex-1">{label}</span>
          {count && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                tone === "amber" && "bg-amber-50 text-amber-600",
                tone === "rose" && "bg-rose-50 text-rose-500",
                !tone && "bg-slate-100 text-slate-400"
              )}
            >
              {count}
            </span>
          )}
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
