"use client";

import { useSetAssistantClientActionState } from "@/hooks/mutations/use-set-assistant-client-action-state";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantClientActionDecision } from "@/types/assistant";

export const useSettleAssistantClientAction = () => {
  const { mutate: saveActionState } = useSetAssistantClientActionState();

  return (messageId: string, actionId: string, state: AssistantClientActionDecision) => {
    const { streamingMessageId, activeStream, setClientActionState, queueClientActionState } = useAssistantStore.getState();
    setClientActionState(messageId, actionId, state);
    if (streamingMessageId === messageId) {
      queueClientActionState(activeStream?.assistantMessageId ?? messageId, actionId, state);
      return;
    }
    saveActionState({ messageId, actionId, state });
  };
};
