import {
  Activity,
  CreditCard,
  KeyRound,
  Layers3,
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
      { label: "Workflows", href: "/workflows", icon: Workflow },
      { label: "Batches", href: "/batches", icon: Layers3 },
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
  batches: "Batches",
  settings: "Settings",
  billing: "Billing",
} as const;
