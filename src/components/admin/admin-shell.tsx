"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAuthStore } from "@/stores/auth";

type AdminShellProps = {
  children: React.ReactNode;
  pageTitle?: string;
};

export const AdminShell = ({ children, pageTitle }: AdminShellProps) => {
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
    <div className="h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="flex h-screen">
        <AdminSidebar
          fullName={user.fullName}
          email={user.email}
          onLogout={handleLogout}
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="h-screen overflow-y-auto">
            <AdminTopbar fullName={user.fullName} onMenuClick={() => setIsMobileSidebarOpen(true)} pageTitle={pageTitle} />
            <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};
