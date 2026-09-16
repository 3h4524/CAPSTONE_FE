"use client";

import { usePathname } from "next/navigation";

import { ROUTE_TITLES } from "@/constants/navigation";
import { capitalize } from "@/helpers/text";

const isTitleKey = (value: string): value is keyof typeof ROUTE_TITLES => value in ROUTE_TITLES;

export const HeaderTitle = () => {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const title = isTitleKey(segment) ? ROUTE_TITLES[segment] : capitalize(segment) || "Dashboard";

  return <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>;
};
