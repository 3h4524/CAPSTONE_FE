"use client";

import { assistantKeys, confirmAssistantAction } from "@/api/assistant";
import { workflowKeys } from "@/api/workflows";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

export const useConfirmAssistantAction = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: confirmAssistantAction,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["workflow-runs"] });
      void client.invalidateQueries({ queryKey: workflowKeys.all });
      void client.invalidateQueries({ queryKey: assistantKeys.conversations() });
    },
  });
};
