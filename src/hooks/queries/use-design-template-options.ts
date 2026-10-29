"use client";

import { designTemplateKeys, getDesignTemplateOptions } from "@/api/design-templates";
import { useQuery } from "@/hooks/queries/use-query";

export const useDesignTemplateOptions = (enabled = true) =>
  useQuery({
    queryKey: designTemplateKeys.options(),
    queryFn: getDesignTemplateOptions,
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
