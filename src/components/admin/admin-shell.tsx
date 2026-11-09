"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/utils/cn";

type AdminShellProps = {
  children: React.ReactNode;
  pageTitle?: string;
  /** On a phone the page fills the space under the header itself, like a chat, instead of scrolling. */
  fillsPhoneScreen?: boolean;
  /** On a phone, leaves the tabs out, so a reply box gets their room. */
  hidesPhoneTabs?: boolean;
};

export const AdminShell = ({ children, pageTitle, fillsPhoneScreen = false, hidesPhoneTabs = false }: AdminShellProps) => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const { mutate: logout } = useLogout();
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  return (
    <div className="relative h-dvh overflow-hidden bg-ink-50 text-ink-900 dark:bg-background">
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
        <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden dark:lg:bg-panel dark:lg:my-2 dark:lg:mr-2 dark:lg:h-[calc(100dvh-1rem)] dark:lg:rounded-xl dark:lg:border">
          <div className={cn("relative min-h-0 flex-1 overflow-y-auto", fillsPhoneScreen && "max-md:flex max-md:flex-col max-md:overflow-hidden")}>
            <AdminTopbar fullName={user.fullName} onMenuClick={() => setIsMobileSidebarOpen(true)} pageTitle={pageTitle} />
            <main className={cn("mx-auto max-w-[1600px] px-4 py-4 max-md:pb-16 sm:py-5 md:px-[calc(1.5rem+1cm)] 2xl:max-w-[1720px]", fillsPhoneScreen && "max-md:flex max-md:min-h-0 max-md:w-full max-md:flex-1 max-md:flex-col max-md:p-0")}>
              {children}
            </main>
          </div>
          {!hidesPhoneTabs && <AdminBottomNav onOpenMore={() => setIsMobileSidebarOpen(true)} />}
        </div>
      </div>
    </div>
  );
};
