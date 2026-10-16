"use client";

import { getAdminRagDocuments, ragAdminDocumentsKey } from "@/api/rag";
import { useQuery } from "@/hooks/queries/use-query";

export const useAdminRagDocuments = (params: { status?: string; sourceId?: string }) =>
  useQuery({
    queryKey: ragAdminDocumentsKey(params.status, params.sourceId),
    queryFn: () => getAdminRagDocuments(params),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.some((document) => document.status === "queued" || document.status === "processing") ? 3000 : false,
    refetchIntervalInBackground: true,
  });
