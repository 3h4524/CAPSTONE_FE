"use client";

import { listMockupTemplates, listSystemMockupTemplates, mockupTemplateKeys, type MockupTemplateScope } from "@/api/mockup-templates";
import { sortMockupList } from "@/helpers/mockup-template";
import { useQuery } from "@/hooks/queries/use-query";

/** The templates a seller can use (the shared ones and their own), or the shared ones as an admin manages them. */
export const useMockupTemplates = (productType?: string, enabled = true, scope: MockupTemplateScope = "seller") =>
  useQuery({
    queryKey: scope === "admin" ? mockupTemplateKeys.library() : mockupTemplateKeys.list(productType),
    queryFn: () => (scope === "admin" ? listSystemMockupTemplates() : listMockupTemplates(productType)),
    enabled,
    staleTime: 5 * 60_000,
    suppressErrorToast: true,
    select: sortMockupList,
  });
