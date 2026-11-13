import type { LucideIcon } from "lucide-react";

export type NavItemKind = "route" | "section";

export interface NavItem {
  label: string;
  href: string;
  kind: NavItemKind;
}

export type AppNavItem = {
  label: string;
  titleKey: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export type AppNavSection = {
  label: string;
  titleKey: string;
  items: AppNavItem[];
};

export type RouteTitle = {
  path: string;
  titleKey: string;
  defaultTitle: string;
};
