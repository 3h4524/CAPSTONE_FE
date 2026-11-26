"use client";

import { ragCorpusHealthPrefix, reingestRagDocuments } from "@/api/rag";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useReingestRagDocuments = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: reingestRagDocuments,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ragCorpusHealthPrefix });
    },
  });
};
