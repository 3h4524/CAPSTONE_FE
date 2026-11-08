"use client";

import { Fragment } from "react";

import { Logo } from "@/components/commons/icons/logo";
import { AccountMenu } from "@/components/commons/layout/app-shell/account/account-menu";
import { Separator } from "@/components/ui/separator";
import { NAV_SECTIONS } from "@/constants/navigation";
import { useSidebarStore } from "@/stores/sidebar";
import { cn } from "@/utils/cn";

import { CollapseToggle } from "./collapse-toggle";
import { NavSection } from "./nav-section";

export const AppSidebar = () => {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  return (
    <aside
      className={cn(
        "bg-card hidden flex-col border-r transition-all duration-200 lg:flex",
        isCollapsed ? "w-[72px]" : "w-60"
      )}
    >
      <div
        className={cn("flex items-center p-3", isCollapsed ? "justify-center" : "justify-between")}
      >
        <span
          className={cn("font-display flex items-center gap-2 text-lg font-bold tracking-tight", isCollapsed && "hidden")}
        >
          <span aria-hidden="true" className="flex shrink-0">
            <Logo height={32} width={32} />
          </span>
          Podivo
        </span>
        <CollapseToggle />
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3" aria-label="Primary navigation">
        {NAV_SECTIONS.map((section, index) => (
          <Fragment key={section.label}>
            {index > 0 && <Separator />}
            <NavSection section={section} collapsed={isCollapsed} />
          </Fragment>
        ))}
      </nav>
      <div className="border-t p-3">
        <AccountMenu collapsed={isCollapsed} />
      </div>
    </aside>
  );
};
