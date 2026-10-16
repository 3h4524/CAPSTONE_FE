"use client";

import { batchJobKeys, listBatchJobs } from "@/api/batch-jobs";
import { useQuery } from "@/hooks/queries/use-query";

export const useBatchJobs = (batchId: string | undefined) =>
  useQuery({
    queryKey: batchJobKeys.byBatch(batchId ?? ""),
    queryFn: () => listBatchJobs(batchId as string),
    enabled: Boolean(batchId),
    suppressErrorToast: true,
  });
