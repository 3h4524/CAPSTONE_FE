"use client";

import { assistantKeys, streamAssistantMessage } from "@/api/assistant";
import { pipeAssistantStream } from "@/helpers/assistant-stream-into-store";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";

type ResumeAssistantStreamInput = {
  exchangeId: string;
  assistantMessageId: string;
  lastEventId: string | null;
  signal: AbortSignal;
};

const resumeIntoStore = ({ exchangeId, assistantMessageId, lastEventId, signal }: ResumeAssistantStreamInput) =>
  pipeAssistantStream({
    exchangeId,
    signal,
    open: (onEvent, attemptSignal) => streamAssistantMessage(assistantMessageId, lastEventId, onEvent, attemptSignal),
    isResume: true,
    replaysFromStart: lastEventId === null,
  });

export const useResumeAssistantStream = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: resumeIntoStore,
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
