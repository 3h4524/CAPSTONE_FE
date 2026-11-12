"use client";

import { assistantKeys, streamAssistantChat } from "@/api/assistant";
import { pipeAssistantStream } from "@/helpers/assistant-stream-into-store";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import type { SendAssistantMessageInput } from "@/types/assistant";

type StreamAssistantReplyInput = { input: SendAssistantMessageInput; exchangeId: string; signal: AbortSignal };

const streamIntoStore = ({ input, exchangeId, signal }: StreamAssistantReplyInput) =>
  pipeAssistantStream({
    exchangeId,
    signal,
    open: (onEvent, attemptSignal) => streamAssistantChat(input, onEvent, attemptSignal),
    isResume: false,
    replaysFromStart: false,
  });

export const useSendAssistantMessage = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: streamIntoStore,
    suppressErrorToast: true,
    onSuccess: (outcome) => {
      if (outcome.status === "gone") {
        void client.invalidateQueries({ queryKey: assistantKeys.conversation(outcome.conversationId) });
        return;
      }
      void client.invalidateQueries({ queryKey: assistantKeys.conversations(), exact: true });
    },
  });
};
