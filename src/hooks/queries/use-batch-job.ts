"use client";

import { batchJobKeys, getBatchJob } from "@/api/batch-jobs";
import { useQuery } from "@/hooks/queries/use-query";

const POLL_INTERVAL_MS = 3000;
const ACTIVE_STATUSES = ["queued", "running"];

// SRS 3.4.10 / BR55 fallback: poll while the job is being processed, stop once it reaches a final state.
// The OCR text check of each design finishes after the job, so keep polling until it is done too.
export const useBatchJob = (batchJobId: string) =>
  useQuery({
    queryKey: batchJobKeys.detail(batchJobId),
    queryFn: () => getBatchJob(batchJobId),
    enabled: batchJobId.length > 0,
    refetchInterval: (query) =>
      ACTIVE_STATUSES.includes(query.state.data?.status ?? "") || query.state.data?.textCheckPending
        ? POLL_INTERVAL_MS
        : false,
  });
