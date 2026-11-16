"use client";

import { useTranslation } from "react-i18next";

import { designTemplateKeys, getDesignTemplate } from "@/api/design-templates";
import { useQuery } from "@/hooks/queries/use-query";
import { normalizeLocale } from "@/i18n/client";

export const useDesignTemplate = (id: string | null, enabled = true) => {
  const { i18n } = useTranslation("common");
  return useQuery({
    queryKey: designTemplateKeys.detail(id ?? "pending", normalizeLocale(i18n.language)),
    queryFn: () => getDesignTemplate(id ?? ""),
    enabled: enabled && Boolean(id),
  });
};
