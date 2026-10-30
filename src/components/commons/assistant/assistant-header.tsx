"use client";

import { Maximize2, MessageCircle, Minimize2, PanelRight, Plus, X } from "lucide-react";

import { AssistantHistoryMenu } from "@/components/commons/assistant/assistant-history-menu";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const nextMode: AssistantDisplayMode = isBubble ? "panel" : "bubble";

  const switchDisplayMode = () => {
    setDisplayMode(nextMode);
    saveDisplayMode(nextMode);
  };

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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={isBubble ? "Dock to the side" : "Switch to bubble"}
        title={isBubble ? "Dock to the side" : "Switch to bubble"}
        onClick={switchDisplayMode}
      >
        {isBubble ? <PanelRight aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
      </Button>
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
        <h2 className="text-foreground font-semibold">Assistant</h2>
        {actions}
      </div>
    );
  }

  return (
    <SheetHeader className="flex-row items-center justify-between gap-2 border-b py-3 pr-12 pl-4">
      <SheetTitle>Assistant</SheetTitle>
      {actions}
    </SheetHeader>
  );
};
