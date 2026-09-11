import { CreditCard, LayoutDashboard, Settings, Workflow } from "lucide-react";

import type { AppNavSection } from "@/types/navigation";

export const NAV_SECTIONS: AppNavSection[] = [
  {
    label: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "WORKSPACE",
    items: [{ label: "Workflows", href: "/workflows", icon: Workflow, disabled: true }],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, disabled: true },
      { label: "Billing", href: "/billing", icon: CreditCard, disabled: true },
    ],
  },
];

export const ROUTE_TITLES = {
  dashboard: "Dashboard",
  profile: "Profile",
  workflows: "Workflows",
  settings: "Settings",
  billing: "Billing",
} as const;
