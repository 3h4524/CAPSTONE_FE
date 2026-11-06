"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { MobileBottomNav } from "@/components/commons/layout/app-shell/bottom-nav/mobile-bottom-nav";
import { ContentArea } from "@/components/commons/layout/app-shell/content-area";
import { AppHeader } from "@/components/commons/layout/app-shell/header/app-header";
import { AppSidebar } from "@/components/commons/layout/app-shell/sidebar/app-sidebar";
import { AppSidebarMobile } from "@/components/commons/layout/app-shell/sidebar/app-sidebar-mobile";
import { TooltipProvider } from "@/components/ui/tooltip";

type AppShellProps = {
  children: ReactNode;
};

export const AppShell = ({ children }: AppShellProps) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // The menu slides in from the side of the control that opened it.
  const [mobileSide, setMobileSide] = useState<"left" | "right">("left");

  const openMobileMenu = (side: "left" | "right") => {
    setMobileSide(side);
    setMobileOpen(true);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isWorkflowRoute = pathname === "/workflows" || pathname?.startsWith("/workflows/") === true;

  if (isWorkflowRoute) {
    return (
      <TooltipProvider>
        <div className="bg-muted/40 flex h-dvh flex-col overflow-hidden">{children}</div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="bg-muted/40 flex h-dvh overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onMobileMenu={() => openMobileMenu("left")} />
          <ContentArea>{children}</ContentArea>
          <MobileBottomNav onOpenMore={() => openMobileMenu("right")} />
        </div>
      </div>
      <AppSidebarMobile open={mobileOpen} onOpenChange={setMobileOpen} side={mobileSide} />
    </TooltipProvider>
  );
};
