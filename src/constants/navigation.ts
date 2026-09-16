import {
  Activity,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Workflow,
} from "lucide-react";

import type { AppNavSection } from "@/types/navigation";

export const NAV_SECTIONS: AppNavSection[] = [
  {
    label: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "WORKSPACE",
    items: [
      { label: "Workflows", href: "/workflows", icon: Workflow, disabled: true },
      { label: "API keys", href: "/api-keys", icon: KeyRound },
      { label: "Usage", href: "/usage", icon: Activity },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Support", href: "/support", icon: LifeBuoy },
      { label: "Settings", href: "/settings", icon: Settings, disabled: true },
      { label: "Billing", href: "/subscription", icon: CreditCard },
    ],
  },
];

export const ROUTE_TITLES = {
  dashboard: "Dashboard",
  profile: "Profile",
  "api-keys": "API keys",
  usage: "Usage",
  support: "Support",
  workflows: "Workflows",
  settings: "Settings",
  billing: "Billing",
} as const;
