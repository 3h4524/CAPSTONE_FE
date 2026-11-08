import {
  Activity,
  BarChart3,
  Compass,
  CreditCard,
  Headphones,
  KeyRound,
  Layers3,
  LayoutDashboard,
  LifeBuoy,
  Palette,
  Settings,
  Shirt,
  Store,
  Users,
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
      { label: "Mock-up templates", href: "/mockups", icon: Shirt },
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

/** The phone's bottom tabs. Every other page stays reachable from the More tab. */
export const MOBILE_TABS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "Batches", href: "/batches", icon: Layers3 },
  { label: "Radar", href: "/market-opportunities", icon: Compass },
];

/** The Admin's bottom tabs; More opens the sidebar for the other pages. */
export const ADMIN_MOBILE_TABS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Revenue", href: "/admin/revenue", icon: BarChart3 },
  { label: "Support", href: "/admin/support-tickets", icon: Headphones },
];

/** The template form: its own action sits at the foot of a phone's screen, where the tabs would be. */
export const isDesignTemplateForm = (pathname: string | null) =>
  /^\/design-templates\/(new|[^/]+\/edit)$/.test(pathname ?? "");

export const ROUTE_TITLES = {
  dashboard: "Dashboard",
  shop: "Shop",
  "design-templates": "Design templates",
  mockups: "Mock-up templates",
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
