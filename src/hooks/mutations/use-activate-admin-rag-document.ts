"use client";

import { activateAdminRagDocument, ragAdminDocumentsKey } from "@/api/rag";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useActivateAdminRagDocument = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: activateAdminRagDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ragAdminDocumentsKey() });
      showToast("success", "RAG version activated.");
    },
  });
};
