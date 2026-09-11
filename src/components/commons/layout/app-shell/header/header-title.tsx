"use client";

import { usePathname } from "next/navigation";

const TITLES = {
  dashboard: "Dashboard",
  profile: "Profile",
  workflows: "Workflows",
  settings: "Settings",
  billing: "Billing",
} as const;

const isTitleKey = (s: string): s is keyof typeof TITLES => s in TITLES;

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const HeaderTitle = () => {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const title = isTitleKey(segment) ? TITLES[segment] : capitalize(segment) || "Dashboard";

  return <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>;
};
