"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/commons/icons/logo";
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

  // On a phone the header is the brand and leads home; the page's name stays for screen readers.
  return (
    <>
      <Link href="/dashboard" aria-label="Podivo, go to the dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
        <span aria-hidden="true" className="flex shrink-0">
          <Logo height={36} width={36} />
        </span>
        <span className="font-display truncate text-base font-bold tracking-tight">Podivo</span>
      </Link>
      <h1 className="min-w-0 truncate text-base font-semibold max-md:sr-only">{title}</h1>
    </>
  );
};
