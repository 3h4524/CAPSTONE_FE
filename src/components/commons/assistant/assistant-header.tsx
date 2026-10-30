"use client";

import Image from "next/image";
import { Maximize2, MessageCircle, Minimize2, Plus, X } from "lucide-react";

import { AssistantHistoryMenu } from "@/components/commons/assistant/assistant-history-menu";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ASSISTANT_MASCOT_SRC } from "@/constants/assistant";
import { type AssistantDisplayMode, saveDisplayMode } from "@/helpers/assistant-display-mode";
import { useAssistantStore } from "@/stores/assistant";

type AssistantHeaderProps = {
  variant: AssistantDisplayMode;
};

export const AssistantHeader = ({ variant }: AssistantHeaderProps) => {
  const startNewConversation = useAssistantStore((state) => state.startNewConversation);
  const setDisplayMode = useAssistantStore((state) => state.setDisplayMode);
  const setOpen = useAssistantStore((state) => state.setOpen);
  const isBubbleExpanded = useAssistantStore((state) => state.isBubbleExpanded);
  const toggleBubbleExpanded = useAssistantStore((state) => state.toggleBubbleExpanded);
  const isBubble = variant === "bubble";

  const switchToBubble = () => {
    setDisplayMode("bubble");
    saveDisplayMode("bubble");
  };

  const avatar = (
    <Image
      src={ASSISTANT_MASCOT_SRC}
      alt=""
      width={28}
      height={28}
      unoptimized
      className="size-7 shrink-0 rounded-full border [image-rendering:pixelated]"
    />
  );

  const actions = (
    <div className="flex items-center gap-1">
      {isBubble ? (
        <Button type="button" variant="ghost" size="icon" aria-label="New chat" title="New chat" onClick={startNewConversation}>
          <Plus aria-hidden="true" />
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={startNewConversation}>
          <Plus aria-hidden="true" />
          New chat
        </Button>
      )}
      <AssistantHistoryMenu />
      {isBubble ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Switch to bubble"
          title="Switch to bubble"
          onClick={switchToBubble}
        >
          <MessageCircle aria-hidden="true" />
        </Button>
      )}
      {isBubble ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isBubbleExpanded ? "Make smaller" : "Expand"}
            title={isBubbleExpanded ? "Make smaller" : "Expand"}
            onClick={toggleBubbleExpanded}
          >
            {isBubbleExpanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Close assistant" title="Close" onClick={() => setOpen(false)}>
            <X aria-hidden="true" />
          </Button>
        </>
      ) : null}
    </div>
  );

  if (isBubble) {
    return (
      <div className="flex items-center justify-between gap-2 border-b py-2 pr-2 pl-4">
        <div className="flex items-center gap-2">
          {avatar}
          <h2 className="text-foreground font-semibold">Assistant</h2>
        </div>
        {actions}
      </div>
    );
  }

  return (
    <SheetHeader className="flex-row items-center justify-between gap-2 border-b py-3 pr-12 pl-4">
      <div className="flex items-center gap-2">
        {avatar}
        <SheetTitle>Assistant</SheetTitle>
      </div>
      {actions}
    </SheetHeader>
  );
};
