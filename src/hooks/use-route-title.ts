"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { findRouteTitle } from "@/helpers/route-title";

export const useRouteTitle = () => {
  const pathname = usePathname();
  const { t } = useTranslation("common");
  const route = findRouteTitle(pathname);

  if (!route) {
    return { title: null, path: null, isNested: false };
  }

  return {
    title: t(route.titleKey, { defaultValue: route.defaultTitle }),
    path: route.path,
    isNested: pathname !== route.path,
  };
};
