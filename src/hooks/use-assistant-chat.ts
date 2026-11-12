"use client";

import { usePathname } from "next/navigation";

import { buildAssistantContext } from "@/helpers/assistant-context";
import { createAssistantPlaceholder, createUserMessage, findRetryPrompt } from "@/helpers/assistant-reducer";
import { useSendAssistantMessage } from "@/hooks/mutations/use-send-assistant-message";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";

let activeController: AbortController | null = null;

const detachFromActiveStream = () => {
  activeController?.abort();
  activeController = null;
};

export const useAssistantChat = () => {
  const pathname = usePathname();
  const { mutate: sendMessage } = useSendAssistantMessage();
  const isStreaming = useAssistantStore((state) => state.streamingMessageId !== null);

  const streamReply = (message: string, exchangeId: string) => {
    const context = buildAssistantContext({
      pathname,
      search: window.location.search,
      workflow: useWorkflowStore.getState(),
    });
    activeController = new AbortController();
    sendMessage({
      input: { conversationId: useAssistantStore.getState().conversationId, message, context },
      exchangeId,
      signal: activeController.signal,
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

  const stop = () => activeController?.abort();

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

  return { send, stop, retry, startNewConversation, openConversation, isStreaming };
};
