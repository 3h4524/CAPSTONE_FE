import {
  CreditCard,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Workflow,
} from "lucide-react";

export type NavItemConfig = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export type NavSectionConfig = {
  label: string;
  items: NavItemConfig[];
};

export const NAV_SECTIONS: NavSectionConfig[] = [
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
