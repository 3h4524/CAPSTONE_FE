"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  Headphones,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";

type AdminSidebarProps = {
  fullName: string;
  email?: string;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

const primaryNavigation = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Subscriptions", href: "/admin/subscription-plans", icon: CreditCard },
];

const secondaryNavigation = [
  { label: "Revenue & Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Batch Jobs", href: "/admin/batch-jobs", icon: BriefcaseBusiness, tone: "amber" },
  { label: "Support Tickets", href: "/admin/support-tickets", icon: Headphones, tone: "rose" },
];

const AdminSidebar = ({
  fullName,
  email = "admin@example.com",
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="size-8 text-slate-500 hover:text-slate-900"
          onClick={onToggleCollapse ?? onClose}
        >
          {isCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-7 px-3 py-6">
        <SidebarGroup label="Overview" isCollapsed={isCollapsed}>
          <SidebarItems items={primaryNavigation} isCollapsed={isCollapsed} />
        </SidebarGroup>
        <SidebarGroup label="Finance & Analytics" isCollapsed={isCollapsed}>
          <SidebarItems items={secondaryNavigation.slice(0, 1)} isCollapsed={isCollapsed} />
        </SidebarGroup>
        <SidebarGroup label="System" isCollapsed={isCollapsed}>
          <SidebarItems items={secondaryNavigation.slice(1)} isCollapsed={isCollapsed} />
        </SidebarGroup>
      </nav>

      <div className="border-t border-slate-100 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={isCollapsed ? "Profile" : undefined}
              className={cn(
                "group flex w-full items-center rounded-lg py-2 transition-colors hover:bg-slate-50 focus:outline-none",
                isCollapsed ? "justify-center px-0" : "gap-3 px-2 text-left"
              )}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                {getInitials(fullName)}
              </div>
              {!isCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{fullName}</p>
                    <p className="truncate text-[10px] text-slate-500">{email}</p>
                  </div>
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm leading-none font-medium">{fullName}</p>
                <p className="text-xs leading-none text-slate-500">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              <span>Profile</span>
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

const SidebarGroup = ({ label, isCollapsed, children }: { label: string; isCollapsed?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    {!isCollapsed && (
      <p className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wider uppercase">
        {label}
      </p>
    )}
    <div className="flex flex-col gap-1">{children}</div>
  </div>
);

const SidebarItems = ({
  items,
  isCollapsed,
}: {
  items: Array<{ label: string; href: string; icon: typeof Users; count?: string; tone?: string }>;
  isCollapsed?: boolean;
}) => {
  const pathname = usePathname();

  return (
    <>
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Button
            key={label}
            variant="ghost"
            asChild
            className={cn(
              "w-full",
              isCollapsed ? "justify-center px-0" : "justify-start gap-3 px-3",
              active ? "bg-muted text-primary font-semibold" : "text-muted-foreground font-medium hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Link
              href={href}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2} />
              {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
            </Link>
          </Button>
        );
      })}
    </>
  );
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export { AdminSidebar };
