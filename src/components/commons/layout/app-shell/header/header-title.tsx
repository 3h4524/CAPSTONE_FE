"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { ROUTE_TITLES } from "@/constants/navigation";
import { capitalize } from "@/helpers/text";

const isTitleKey = (value: string): value is keyof typeof ROUTE_TITLES => value in ROUTE_TITLES;

export const HeaderTitle = () => {
  const pathname = usePathname();
  const { t } = useTranslation("common");
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const routeKey = isTitleKey(segment) ? segment : "dashboard";
  const itemKey = routeKey === "design-templates"
    ? "templates"
    : routeKey === "market-opportunities"
      ? "marketRadar"
      : routeKey === "styles"
        ? "styles"
        : routeKey === "billing"
          ? "billing"
          : routeKey;
  const title = t(`navigation.items.${itemKey}`, {
    defaultValue: isTitleKey(segment) ? ROUTE_TITLES[segment] : capitalize(segment) || t("header.dashboard"),
  });

  return <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>;
};
