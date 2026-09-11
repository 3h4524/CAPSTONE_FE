"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";

import type { NavItemConfig } from "./app-navigation";

type NavItemProps = {
  item: NavItemConfig;
  collapsed: boolean;
};

export const NavItem = ({ item, collapsed }: NavItemProps) => {
  const pathname = usePathname();
  const Icon = item.icon;
  const isActive = !item.disabled && (pathname === item.href || pathname.startsWith(item.href + "/"));

  if (item.disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("flex", collapsed && "justify-center")}>
            <Button
              type="button"
              variant="ghost"
              aria-disabled="true"
              tabIndex={-1}
              className={cn(
                "text-muted-foreground w-full cursor-not-allowed opacity-60",
                collapsed ? "justify-center px-0" : "justify-start"
              )}
            >
              <Icon />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">Coming soon</TooltipContent>
      </Tooltip>
    );
  }

  const linkButton = (
    <Button
      variant="ghost"
      asChild
      className={cn(
        "w-full",
        collapsed ? "justify-center px-0" : "justify-start",
        isActive && "bg-muted text-primary font-semibold"
      )}
    >
      <Link href={item.href} aria-current={isActive ? "page" : undefined}>
        <Icon />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    </Button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkButton}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return linkButton;
};
