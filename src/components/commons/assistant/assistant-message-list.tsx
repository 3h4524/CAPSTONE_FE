"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

import { AssistantMessage } from "@/components/commons/assistant/assistant-message";
import { AssistantMessageSkeleton } from "@/components/commons/assistant/assistant-message-skeleton";
import { AssistantStarterChips } from "@/components/commons/assistant/assistant-starter-chips";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ASSISTANT_SCROLL_BOTTOM_TOLERANCE_PX } from "@/constants/assistant";
import { useAssistantConversation } from "@/hooks/queries/use-assistant-conversation";
import { useAssistantStore } from "@/stores/assistant";

export const AssistantMessageList = () => {
  const messages = useAssistantStore((state) => state.messages);
  const selectedConversationId = useAssistantStore((state) => state.selectedConversationId);
  const { isLoading: isLoadingConversation } = useAssistantConversation(selectedConversationId);
  const endRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const lastUserMessageKeyRef = useRef<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const end = endRef.current;
    if (!end) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const atBottom = entry?.isIntersecting ?? true;
        isAtBottomRef.current = atBottom;
        setIsAtBottom(atBottom);
      },
      {
        root: end.closest("[data-radix-scroll-area-viewport]"),
        rootMargin: `0px 0px ${ASSISTANT_SCROLL_BOTTOM_TOLERANCE_PX}px 0px`,
      }
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const lastUserMessageKey = messages.findLast((message) => message.role === "user")?.key ?? null;
    const sentNewMessage = lastUserMessageKey !== null && lastUserMessageKey !== lastUserMessageKeyRef.current;
    lastUserMessageKeyRef.current = lastUserMessageKey;
    if (isAtBottomRef.current || sentNewMessage) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const scrollToLatest = () => endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          {isLoadingConversation && isEmpty ? <AssistantMessageSkeleton /> : null}
          {!isLoadingConversation && isEmpty ? <AssistantStarterChips /> : null}
          {messages.map((message) => (
            <AssistantMessage key={message.key} message={message} />
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>
      {!isAtBottom && !isEmpty ? (
        <Button
          size="sm"
          variant="secondary"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-md"
          onClick={scrollToLatest}
        >
          <ArrowDown />
          Latest
        </Button>
      ) : null}
    </div>
  );
};
