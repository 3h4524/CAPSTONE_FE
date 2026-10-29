"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";

import { buildAssistantContext } from "@/helpers/assistant-context";
import { createAssistantPlaceholder, createUserMessage } from "@/helpers/assistant-reducer";
import { getErrorMessage } from "@/helpers/error-message";
import { useSendAssistantMessage } from "@/hooks/mutations/use-send-assistant-message";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";

export const useAssistantChat = () => {
  const pathname = usePathname();
  const controllerRef = useRef<AbortController | null>(null);
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
    const controller = new AbortController();
    controllerRef.current = controller;
    sendMessage(
      { input: { conversationId: store.conversationId, message, context }, signal: controller.signal },
      {
        onError: (error) => {
          if (axios.isCancel(error) || controller.signal.aborted) {
            useAssistantStore.getState().stopStreaming();
            return;
          }
          useAssistantStore.getState().failStreaming({ code: "request_failed", message: getErrorMessage(error) });
        },
      }
    );
  };

  const stop = () => controllerRef.current?.abort();

  const retryLast = () => {
    const lastUserMessage = useAssistantStore.getState().messages.findLast((message) => message.role === "user");
    if (lastUserMessage) send(lastUserMessage.content);
  };

  return { send, stop, retryLast, isStreaming };
};
