"use client";

import { getAdminRagDocument } from "@/api/rag";
import { useQuery } from "@/hooks/queries/use-query";

export const useAdminRagDocument = (documentId: string | null) =>
  useQuery({
    queryKey: ["admin", "rag", "document", documentId],
    queryFn: () => getAdminRagDocument(documentId ?? ""),
    enabled: Boolean(documentId),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.document.status === "queued" || query.state.data?.document.status === "processing" ? 3000 : false,
    refetchIntervalInBackground: true,
  });
