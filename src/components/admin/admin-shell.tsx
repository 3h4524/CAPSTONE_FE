"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ADMIN_FILLS_PHONE_SCREEN_ROUTES } from "@/constants/navigation";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAdminShellStore } from "@/stores/admin-shell";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/utils/cn";

type AdminShellProps = {
  children: React.ReactNode;
  /** On a phone the page fills the space under the header itself, like a chat, instead of scrolling. */
  fillsPhoneScreen?: boolean;
  /** On a phone, leaves the tabs out, so a reply box gets their room. */
  hidesPhoneTabs?: boolean;
};

export const AdminShell = ({ children, fillsPhoneScreen = false, hidesPhoneTabs = false }: AdminShellProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hidesPhoneTabsFromStore = useAdminShellStore((state) => state.hidesPhoneTabs);
  const { mutate: logout } = useLogout();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const isAdmin = Boolean(user?.roles.some((role) => role.toLowerCase() === "admin"));

  // Check auth
  if (!isHydrated) {
    return <PageLoading label="Loading..." />;
  }

  if (!user || !isAdmin) {
    // We let the page's useEffect handle the redirect to /login or /
    return <PageLoading label="Redirecting..." />;
  }

  const handleLogout = () => logout(undefined, { onSettled: () => router.replace("/login") });
  const isPhoneScreenFilled = fillsPhoneScreen || ADMIN_FILLS_PHONE_SCREEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const isPhoneTabsHidden = hidesPhoneTabs || hidesPhoneTabsFromStore;

  return (
    <TooltipProvider>
      <div className="bg-ink-50 text-ink-900 dark:bg-background relative h-dvh overflow-hidden">
        <div className="flex h-dvh">
          <AdminSidebar
            fullName={user.fullName}
            email={user.email}
            onLogout={handleLogout}
            isMobileOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
          />
          <div className="dark:lg:bg-panel flex h-dvh min-w-0 flex-1 flex-col overflow-hidden dark:lg:my-2 dark:lg:mr-2 dark:lg:h-[calc(100dvh-1rem)] dark:lg:rounded-xl dark:lg:border">
            <div ref={scrollContainerRef} className={cn("relative min-h-0 flex-1 overflow-y-auto", isPhoneScreenFilled && "max-md:flex max-md:flex-col max-md:overflow-hidden")}>
              <AdminTopbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
              <main className={cn("mx-auto max-w-[1600px] px-4 py-4 max-md:pb-16 sm:py-5 md:px-[calc(1.5rem+1cm)] 2xl:max-w-[1720px]", isPhoneScreenFilled && "max-md:flex max-md:min-h-0 max-md:w-full max-md:flex-1 max-md:flex-col max-md:p-0")}>
                {children}
              </main>
            </div>
            {!isPhoneTabsHidden && <AdminBottomNav onOpenMore={() => setIsMobileSidebarOpen(true)} />}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
