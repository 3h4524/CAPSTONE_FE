"use client";

import { retrieveAndIngestMarketResearch } from "@/api/market-research";
import { ragAdminDocumentsKey } from "@/api/rag";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useRetrieveMarketResearch = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: retrieveAndIngestMarketResearch,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ragAdminDocumentsKey() });
      showToast("success", `${result.selectedCount} Etsy listing references queued for RAG.`);
    },
  });
};
