"use client";

import { assistantKeys, rejectAssistantAction } from "@/api/assistant";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useRejectAssistantAction = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: rejectAssistantAction,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: assistantKeys.conversations() });
    },
  });
};
