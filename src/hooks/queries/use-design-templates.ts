"use client";

import { useTranslation } from "react-i18next";

import { designTemplateKeys, listDesignTemplates } from "@/api/design-templates";
import { useQuery } from "@/hooks/queries/use-query";
import { normalizeLocale } from "@/i18n/client";
import type { DesignTemplateFilters } from "@/types/design-template";

export const useDesignTemplates = (filters: DesignTemplateFilters, enabled = true) => {
  const { i18n } = useTranslation("common");
  return useQuery({
    queryKey: designTemplateKeys.list(filters, normalizeLocale(i18n.language)),
    queryFn: () => listDesignTemplates(filters),
    enabled,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === filters.scope ? previous : undefined,
  });
};
