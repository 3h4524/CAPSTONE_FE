"use client";

import { usePathname } from "next/navigation";

import { buildAssistantContext } from "@/helpers/assistant-context";
import { createAssistantPlaceholder, createUserMessage } from "@/helpers/assistant-reducer";
import { useSendAssistantMessage } from "@/hooks/mutations/use-send-assistant-message";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";

let activeController: AbortController | null = null;

export const useAssistantChat = () => {
  const pathname = usePathname();
  const { mutate: sendMessage } = useSendAssistantMessage();
  const isStreaming = useAssistantStore((state) => state.streamingMessageId !== null);

  const send = (text: string) => {
    const message = text.trim();
    const store = useAssistantStore.getState();
    if (!message || store.streamingMessageId !== null) return;
    store.beginExchange(createUserMessage(message), createAssistantPlaceholder());
    const context = buildAssistantContext({
      pathname,
      search: window.location.search,
      workflow: useWorkflowStore.getState(),
    });
    activeController = new AbortController();
    sendMessage({
      input: { conversationId: store.conversationId, message, context },
      signal: activeController.signal,
    });
  };

  const stop = () => activeController?.abort();

  const retryLast = () => {
    const lastUserMessage = useAssistantStore.getState().messages.findLast((message) => message.role === "user");
    if (lastUserMessage) send(lastUserMessage.content);
  };

  return { send, stop, retryLast, isStreaming };
};
