"use client";

import { usePathname } from "next/navigation";

import { buildAssistantContext } from "@/helpers/assistant-context";
import { createAssistantPlaceholder, createUserMessage, findRetryPrompt } from "@/helpers/assistant-reducer";
import { getErrorMessage } from "@/helpers/error-message";
import { isConflictResponse } from "@/helpers/response-status";
import { showToast } from "@/helpers/toast";
import { useResumeAssistantStream } from "@/hooks/mutations/use-resume-assistant-stream";
import { useSendAssistantMessage } from "@/hooks/mutations/use-send-assistant-message";
import { useStopAssistantMessage } from "@/hooks/mutations/use-stop-assistant-message";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";

let activeController: AbortController | null = null;

export const detachFromActiveStream = () => {
  activeController?.abort();
  activeController = null;
};

const openStreamSignal = () => {
  activeController = new AbortController();
  return activeController.signal;
};

export const useAssistantChat = () => {
  const pathname = usePathname();
  const { mutate: sendMessage } = useSendAssistantMessage();
  const { mutate: resumeStream } = useResumeAssistantStream();
  const { mutate: stopMessage, isPending: isStopping } = useStopAssistantMessage();
  const isStreaming = useAssistantStore((state) => state.streamingMessageId !== null);

  const streamReply = (message: string, exchangeId: string) => {
    const context = buildAssistantContext({
      pathname,
      search: window.location.search,
      workflow: useWorkflowStore.getState(),
    });
    sendMessage({
      input: { conversationId: useAssistantStore.getState().conversationId, message, context },
      exchangeId,
      signal: openStreamSignal(),
    });
  };

  const send = (text: string) => {
    const message = text.trim();
    const store = useAssistantStore.getState();
    if (!message || store.streamingMessageId !== null) return;
    const placeholder = createAssistantPlaceholder();
    store.beginExchange(createUserMessage(message), placeholder);
    streamReply(message, placeholder.id);
  };

  const stop = () => {
    const { streamingMessageId, activeStream, stopStreaming } = useAssistantStore.getState();
    if (streamingMessageId === null) return;
    const assistantMessageId = activeStream?.assistantMessageId;
    if (!assistantMessageId) {
      detachFromActiveStream();
      stopStreaming(streamingMessageId);
      return;
    }
    stopMessage(assistantMessageId, {
      onError: (error) => {
        if (!isConflictResponse(error)) showToast("error", getErrorMessage(error));
      },
    });
  };

  const attachToStreamingReply = () => {
    const { streamingMessageId, activeStream, markStreamAttached } = useAssistantStore.getState();
    if (streamingMessageId === null || !activeStream?.assistantMessageId || activeStream.isAttached) return;
    markStreamAttached(streamingMessageId);
    resumeStream({
      exchangeId: streamingMessageId,
      assistantMessageId: activeStream.assistantMessageId,
      lastEventId: activeStream.lastEventId,
      signal: openStreamSignal(),
    });
  };

  const retry = (failedMessageKey: string) => {
    const store = useAssistantStore.getState();
    const prompt = findRetryPrompt(store.messages, failedMessageKey);
    if (!prompt || store.streamingMessageId !== null) return;
    const placeholder = createAssistantPlaceholder();
    store.retryExchange(failedMessageKey, placeholder);
    streamReply(prompt.content, placeholder.id);
  };

  const startNewConversation = () => {
    detachFromActiveStream();
    useAssistantStore.getState().startNewConversation();
  };

  const openConversation = (id: string) => {
    const { conversationId, selectedConversationId, selectConversation } = useAssistantStore.getState();
    if ((conversationId ?? selectedConversationId) === id) return;
    detachFromActiveStream();
    selectConversation(id);
  };

  return { send, stop, retry, attachToStreamingReply, startNewConversation, openConversation, isStreaming, isStopping };
};
