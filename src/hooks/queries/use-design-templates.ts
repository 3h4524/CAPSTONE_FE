"use client";

import { designTemplateKeys, listDesignTemplates } from "@/api/design-templates";
import { useQuery } from "@/hooks/queries/use-query";
import type { DesignTemplateFilters } from "@/types/design-template";

export const useDesignTemplates = (filters: DesignTemplateFilters, enabled = true) =>
  useQuery({
    queryKey: designTemplateKeys.list(filters),
    queryFn: () => listDesignTemplates(filters),
    enabled,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === filters.scope ? previous : undefined,
  });
