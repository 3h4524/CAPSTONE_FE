"use client";

import { Fragment } from "react";

import { AccountMenu } from "@/components/private/app-shell/account/account-menu";
import { Separator } from "@/components/ui/separator";
import { useSidebarStore } from "@/stores/sidebar";
import { cn } from "@/utils/cn";

import { NAV_SECTIONS } from "./app-navigation";
import { CollapseToggle } from "./collapse-toggle";
import { NavSection } from "./nav-section";

export const AppSidebar = () => {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  return (
    <aside
      className={cn(
        "bg-background hidden flex-col border-r transition-all duration-200 lg:flex",
        isCollapsed ? "w-[72px]" : "w-60"
      )}
    >
      <div
        className={cn("flex items-center p-3", isCollapsed ? "justify-center" : "justify-between")}
      >
        <span
          className={cn("font-display text-lg font-bold tracking-tight", isCollapsed && "hidden")}
        >
          APCS
        </span>
        <CollapseToggle />
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3" aria-label="Primary">
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
