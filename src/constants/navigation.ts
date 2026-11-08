import {
  Activity,
  Compass,
  CreditCard,
  KeyRound,
  Layers3,
  LayoutDashboard,
  LifeBuoy,
  Palette,
  Settings,
  Store,
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
      { label: "Shop", href: "/shop", icon: Store },
      { label: "Workflows", href: "/workflows", icon: Workflow },
      { label: "Batches", href: "/batches", icon: Layers3 },
      { label: "My Styles", href: "/styles", icon: Palette },
      { label: "Design templates", href: "/design-templates", icon: WandSparkles },
      { label: "API keys", href: "/api-keys", icon: KeyRound },
      { label: "Usage", href: "/usage", icon: Activity },
      { label: "Market Radar", href: "/market-opportunities", icon: Compass },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Support", href: "/support", icon: LifeBuoy },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Billing", href: "/subscription", icon: CreditCard },
    ],
  },
];

export const ROUTE_TITLES = {
  dashboard: "Dashboard",
  shop: "Shop",
  "design-templates": "Design templates",
  profile: "Profile",
  "api-keys": "API keys",
  usage: "Usage",
  support: "Support",
  workflows: "Workflows",
  batches: "Batches",
  styles: "My Styles",
  settings: "Settings",
  billing: "Billing",
  "market-opportunities": "Market Radar",
  "market-insights": "Market Insights",
} as const;
