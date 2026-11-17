"use client";

import { Bot, Maximize2, MessageCircle, Minimize2, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AssistantHistoryMenu } from "@/components/commons/assistant/assistant-history-menu";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { type AssistantDisplayMode, saveDisplayMode } from "@/helpers/assistant-display-mode";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useAssistantStore } from "@/stores/assistant";

type AssistantHeaderProps = {
  variant: AssistantDisplayMode;
};

export const AssistantHeader = ({ variant }: AssistantHeaderProps) => {
  const { t } = useTranslation("common");
  const { startNewConversation } = useAssistantChat();
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
    <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full border">
      <Bot className="size-4" aria-hidden="true" />
    </span>
  );

  const actions = (
    <div className="flex items-center gap-1">
      {isBubble ? (
        <Button type="button" variant="ghost" size="icon" aria-label={t("commons.assistant.newChat")} title={t("commons.assistant.newChat")} onClick={startNewConversation}>
          <Plus aria-hidden="true" />
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={startNewConversation}>
          <Plus aria-hidden="true" />
          {t("commons.assistant.newChat")}
        </Button>
      )}
      <AssistantHistoryMenu />
      {isBubble ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("commons.assistant.switchToBubble")}
          title={t("commons.assistant.switchToBubble")}
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
            aria-label={isBubbleExpanded ? t("commons.assistant.makeSmaller") : t("commons.assistant.expand")}
            title={isBubbleExpanded ? t("commons.assistant.makeSmaller") : t("commons.assistant.expand")}
            onClick={toggleBubbleExpanded}
          >
            {isBubbleExpanded ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={t("commons.assistant.closePodi")} title={t("commons.assistant.close")} onClick={() => setOpen(false)}>
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
          <h2 className="text-foreground font-semibold">Podi</h2>
        </div>
        {actions}
      </div>
    );
  }

  return (
    <SheetHeader className="flex-row items-center justify-between gap-2 border-b py-3 pr-12 pl-4">
      <div className="flex items-center gap-2">
        {avatar}
        <SheetTitle>Podi</SheetTitle>
      </div>
      {actions}
    </SheetHeader>
  );
};
