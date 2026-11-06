"use client";

import { getMarketQueryCollectionJob } from "@/api/market-insights";
import { useQuery } from "@/hooks/queries/use-query";

export const useMarketQueryCollectionJob = (jobId: string | null) =>
  useQuery({
    queryKey: ["market-insights", "collection-job", jobId],
    queryFn: () => getMarketQueryCollectionJob(jobId!),
    enabled: Boolean(jobId),
    retry: false,
    suppressErrorToast: true,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 1500 : false;
    },
  });
