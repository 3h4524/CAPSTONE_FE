import {
  Activity,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Palette,
  Settings,
  WandSparkles,
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
      { label: "My Styles", href: "/styles", icon: Palette },
      { label: "Design templates", href: "/design-templates", icon: WandSparkles },
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
  "design-templates": "Design templates",
  profile: "Profile",
  "api-keys": "API keys",
  usage: "Usage",
  support: "Support",
  workflows: "Workflows",
  styles: "My Styles",
  settings: "Settings",
  billing: "Billing",
} as const;
