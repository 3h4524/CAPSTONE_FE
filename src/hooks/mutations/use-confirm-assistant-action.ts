"use client";

import { assistantKeys, confirmAssistantAction } from "@/api/assistant";
import { workflowKeys } from "@/api/workflows";
import { toAssistantUiMessage } from "@/helpers/assistant-messages";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAssistantStore } from "@/stores/assistant";

export const useConfirmAssistantAction = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: confirmAssistantAction,
    onSuccess: (result) => {
      const { upsertPendingAction, appendMessage, conversationId } = useAssistantStore.getState();
      upsertPendingAction(result.action);
      appendMessage(toAssistantUiMessage(result.message));
      void client.invalidateQueries({ queryKey: ["workflow-runs"] });
      void client.invalidateQueries({ queryKey: workflowKeys.all });
      void client.invalidateQueries({ queryKey: assistantKeys.conversation(conversationId) });
    },
  });
};
