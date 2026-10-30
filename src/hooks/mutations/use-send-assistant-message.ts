"use client";

import axios from "axios";

import { assistantKeys, streamAssistantChat } from "@/api/assistant";
import { getErrorMessage } from "@/helpers/error-message";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAssistantStore } from "@/stores/assistant";
import type { SendAssistantMessageInput } from "@/types/assistant";

const STREAM_INTERRUPTED_ERROR = {
  code: "stream_interrupted",
  message: "The connection was interrupted. Please try again.",
};

const streamIntoStore = async ({ input, signal }: { input: SendAssistantMessageInput; signal: AbortSignal }) => {
  const { applyStreamEvent, stopStreaming, failStreaming } = useAssistantStore.getState();
  try {
    await streamAssistantChat(input, applyStreamEvent, signal);
    if (useAssistantStore.getState().streamingMessageId !== null) failStreaming(STREAM_INTERRUPTED_ERROR);
  } catch (error) {
    if (axios.isCancel(error) || signal.aborted) {
      stopStreaming();
      return;
    }
    failStreaming({ code: "request_failed", message: getErrorMessage(error) });
  }
};

export const useSendAssistantMessage = () => {
  const client = useAppQueryClient();
  return useMutation({
    mutationFn: streamIntoStore,
    suppressErrorToast: true,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: assistantKeys.conversations() });
    },
  });
};
