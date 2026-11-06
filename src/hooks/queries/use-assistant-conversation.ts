"use client";

import { useEffect } from "react";

import { assistantKeys, getAssistantConversation } from "@/api/assistant";
import { toAssistantChatState } from "@/helpers/assistant-messages";
import { useQuery } from "@/hooks/queries/use-query";
import { useAssistantStore } from "@/stores/assistant";

export const useAssistantConversation = (id: string | null) => {
  const query = useQuery({
    queryKey: assistantKeys.conversation(id),
    queryFn: () => getAssistantConversation(id!),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  });
  const { data, dataUpdatedAt } = query;

  useEffect(() => {
    if (data) useAssistantStore.getState().loadConversation(toAssistantChatState(data));
  }, [data, dataUpdatedAt]);

  return query;
};
