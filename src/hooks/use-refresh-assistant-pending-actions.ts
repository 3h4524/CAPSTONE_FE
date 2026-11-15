"use client";

import { assistantKeys, getAssistantConversation } from "@/api/assistant";
import { getErrorMessage } from "@/helpers/error-message";
import { Log } from "@/helpers/log";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAssistantStore } from "@/stores/assistant";

export const useRefreshAssistantPendingActions = () => {
  const client = useAppQueryClient();

  return (conversationId: string | null) => {
    if (conversationId === null) return;
    client
      .fetchQuery({
        queryKey: assistantKeys.conversation(conversationId),
        queryFn: ({ signal }) => getAssistantConversation(conversationId, signal),
        staleTime: 0,
      })
      .then((detail) => {
        const { conversationId: currentId, upsertPendingAction } = useAssistantStore.getState();
        if (currentId === conversationId) detail.pendingActions.forEach((action) => upsertPendingAction(action));
      })
      .catch((error: unknown) => {
        Log.warn({ prefix: "assistant/pending-actions", message: getErrorMessage(error) });
      });
  };
};
