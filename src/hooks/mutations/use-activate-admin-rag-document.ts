"use client";

import { activateAdminRagDocument, ragAdminDocumentPrefix, ragAdminDocumentsPrefix } from "@/api/rag";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useActivateAdminRagDocument = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: activateAdminRagDocument,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ragAdminDocumentsPrefix }),
        queryClient.invalidateQueries({ queryKey: ragAdminDocumentPrefix }),
      ]);
      showToast("success", "RAG version activated.");
    },
  });
};
