"use client";

import { Plus } from "lucide-react";

import { AssistantHistoryMenu } from "@/components/commons/assistant/assistant-history-menu";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAssistantStore } from "@/stores/assistant";

export const AssistantHeader = () => {
  const startNewConversation = useAssistantStore((state) => state.startNewConversation);

  return (
    <SheetHeader className="flex-row items-center justify-between gap-2 border-b py-3 pr-12 pl-4">
      <SheetTitle>Assistant</SheetTitle>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={startNewConversation}>
          <Plus aria-hidden="true" />
          New chat
        </Button>
        <AssistantHistoryMenu />
      </div>
    </SheetHeader>
  );
};
