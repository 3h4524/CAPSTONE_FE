"use client";

import { useEffect, useRef } from "react";

import { AssistantMessage } from "@/components/commons/assistant/assistant-message";
import { AssistantMessageSkeleton } from "@/components/commons/assistant/assistant-message-skeleton";
import { AssistantStarterChips } from "@/components/commons/assistant/assistant-starter-chips";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAssistantConversation } from "@/hooks/queries/use-assistant-conversation";
import { useAssistantStore } from "@/stores/assistant";

export const AssistantMessageList = () => {
  const messages = useAssistantStore((state) => state.messages);
  const selectedConversationId = useAssistantStore((state) => state.selectedConversationId);
  const { isLoading: isLoadingConversation } = useAssistantConversation(selectedConversationId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-4 p-4">
        {isLoadingConversation && isEmpty ? <AssistantMessageSkeleton /> : null}
        {!isLoadingConversation && isEmpty ? <AssistantStarterChips /> : null}
        {messages.map((message) => (
          <AssistantMessage key={message.id} message={message} />
        ))}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
};
