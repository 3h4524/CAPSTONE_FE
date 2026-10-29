"use client";

import { getBatchProductPrompt, productPromptKeys } from "@/api/product-prompt";
import { useQuery } from "@/hooks/queries/use-query";

export const useBatchProductPrompt = (rowId: string, open: boolean) =>
  useQuery({
    queryKey: productPromptKeys.detail(rowId),
    queryFn: () => getBatchProductPrompt(rowId),
    enabled: open && rowId.length > 0,
    staleTime: 60_000,
    suppressErrorToast: true,
  });
