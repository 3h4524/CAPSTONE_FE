"use client";

import { getBatchMockupSelection, mockupTemplateKeys } from "@/api/mockup-templates";
import { useQuery } from "@/hooks/queries/use-query";

export const useBatchMockupSelection = (batchJobId: string, enabled = true) =>
  useQuery({
    queryKey: mockupTemplateKeys.selection(batchJobId),
    queryFn: () => getBatchMockupSelection(batchJobId),
    enabled: enabled && batchJobId.length > 0,
    staleTime: 60_000,
    suppressErrorToast: true,
  });
