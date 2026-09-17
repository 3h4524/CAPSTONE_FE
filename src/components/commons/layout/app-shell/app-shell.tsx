"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ContentArea } from "@/components/commons/layout/app-shell/content-area";
import { AppHeader } from "@/components/commons/layout/app-shell/header/app-header";
import { AppSidebar } from "@/components/commons/layout/app-shell/sidebar/app-sidebar";
import { AppSidebarMobile } from "@/components/commons/layout/app-shell/sidebar/app-sidebar-mobile";
import { UserHydrator } from "@/components/commons/layout/app-shell/user-hydrator";
import { TooltipProvider } from "@/components/ui/tooltip";

type AppShellProps = {
  children: ReactNode;
};

export const AppShell = ({ children }: AppShellProps) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <TooltipProvider>
      <div className="bg-muted/40 flex h-screen overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onMobileMenu={() => setMobileOpen(true)} />
          <UserHydrator />
          <ContentArea>{children}</ContentArea>
        </div>
      </div>
      <AppSidebarMobile open={mobileOpen} onOpenChange={setMobileOpen} />
    </TooltipProvider>
  );
};
