"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/commons/icons/logo";
import { useRouteTitle } from "@/hooks/use-route-title";

export const HeaderTitle = () => {
  const { t } = useTranslation("common");
  const { title } = useRouteTitle();

  // On a phone the header is the brand and leads home; the page's name stays for screen readers.
  return (
    <>
      <Link href="/dashboard" aria-label={t("commons.header.goToDashboard")} className="flex min-w-0 items-center gap-2 md:hidden">
        <span aria-hidden="true" className="flex shrink-0">
          <Logo height={36} width={36} />
        </span>
        <span className="font-display truncate text-base font-bold tracking-tight">Podivo</span>
      </Link>
      <p className="min-w-0 truncate text-base font-semibold max-md:hidden">{title}</p>
    </>
  );
};
