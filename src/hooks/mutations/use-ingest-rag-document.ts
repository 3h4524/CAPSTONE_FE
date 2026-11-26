"use client";

import { ingestRagDocument, ragAdminDocumentKey, ragAdminDocumentsPrefix } from "@/api/rag";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useIngestRagDocument = () => {
  const queryClient = useAppQueryClient();

  return useMutation({
    mutationFn: ingestRagDocument,
    onSuccess: ({ documentId }) => {
      void queryClient.invalidateQueries({ queryKey: ragAdminDocumentsPrefix });
      void queryClient.invalidateQueries({ queryKey: ragAdminDocumentKey(documentId) });
    },
  });
};
