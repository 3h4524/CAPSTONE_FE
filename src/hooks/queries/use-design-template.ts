"use client";

import { designTemplateKeys, getDesignTemplate } from "@/api/design-templates";
import { useQuery } from "@/hooks/queries/use-query";

export const useDesignTemplate = (id: string | null, enabled = true) =>
  useQuery({
    queryKey: designTemplateKeys.detail(id ?? "pending"),
    queryFn: () => getDesignTemplate(id ?? ""),
    enabled: enabled && Boolean(id),
  });
