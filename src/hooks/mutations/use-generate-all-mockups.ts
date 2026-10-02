"use client";

import { generateAllBatchMockups } from "@/api/mockup-templates";
import { useMutation } from "@/hooks/mutations/use-mutation";

export const useGenerateAllMockups = () =>
  useMutation({
    mutationFn: (batchJobId: string) => generateAllBatchMockups(batchJobId),
  });
