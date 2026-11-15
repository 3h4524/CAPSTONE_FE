"use client";

import { useEffect } from "react";

import { assistantKeys, getAssistantConversation } from "@/api/assistant";
import { flushQueuedClientActionStates } from "@/helpers/assistant-client-action-queue";
import { toAssistantChatState } from "@/helpers/assistant-messages";
import { getErrorMessage } from "@/helpers/error-message";
import { isNotFoundResponse } from "@/helpers/response-status";
import { showToast } from "@/helpers/toast";
import { useQuery } from "@/hooks/queries/use-query";
import { useAssistantStore } from "@/stores/assistant";

export const useAssistantConversation = (id: string | null) => {
  const query = useQuery({
    queryKey: assistantKeys.conversation(id),
    queryFn: () => getAssistantConversation(id!),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
    suppressErrorToast: true,
    onError: (error) => {
      if (isNotFoundResponse(error)) useAssistantStore.getState().startNewConversation();
      else showToast("error", getErrorMessage(error));
    },
  });
  const { data, dataUpdatedAt } = query;

  useEffect(() => {
    if (!data) return;
    useAssistantStore.getState().loadConversation(toAssistantChatState(data));
    flushQueuedClientActionStates();
  }, [data, dataUpdatedAt]);

  return query;
};
