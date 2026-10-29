"use client";

import { useState } from "react";
import { History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssistantConversations } from "@/hooks/queries/use-assistant-conversations";
import { useAssistantStore } from "@/stores/assistant";

const SKELETON_ROWS = [0, 1, 2];

export const AssistantHistoryMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const selectConversation = useAssistantStore((state) => state.selectConversation);
  const { data: conversations, isLoading: isLoadingConversations } = useAssistantConversations(isOpen);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Chat history">
          <History aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Recent chats</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoadingConversations
          ? SKELETON_ROWS.map((row) => <Skeleton key={row} className="mx-2 my-2 h-5" />)
          : null}
        {conversations?.length === 0 ? <p className="text-muted-foreground px-2 py-1.5 text-sm">No chats yet</p> : null}
        {conversations?.map((conversation) => (
          <DropdownMenuItem key={conversation.id} onSelect={() => selectConversation(conversation.id)}>
            <span className="truncate">{conversation.title}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
