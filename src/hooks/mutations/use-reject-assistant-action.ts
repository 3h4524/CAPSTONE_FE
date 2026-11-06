"use client";

import { assistantKeys, rejectAssistantAction } from "@/api/assistant";
import { toAssistantUiMessage } from "@/helpers/assistant-messages";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAssistantStore } from "@/stores/assistant";

export const useRejectAssistantAction = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: rejectAssistantAction,
    onSuccess: (result) => {
      const { upsertPendingAction, appendMessage, conversationId } = useAssistantStore.getState();
      upsertPendingAction(result.action);
      appendMessage(toAssistantUiMessage(result.message));
      void client.invalidateQueries({ queryKey: assistantKeys.conversation(conversationId) });
    },
  });
};
