"use client";

import { listMockupTemplates, mockupTemplateKeys } from "@/api/mockup-templates";
import { sortMockupList } from "@/helpers/mockup-template";
import { useQuery } from "@/hooks/queries/use-query";

export const useMockupTemplates = (productType?: string, enabled = true) =>
  useQuery({
    queryKey: mockupTemplateKeys.list(productType),
    queryFn: () => listMockupTemplates(productType),
    enabled,
    staleTime: 5 * 60_000,
    suppressErrorToast: true,
    select: sortMockupList,
  });
