"use client";

import { useState } from "react";
import { History, Trash2 } from "lucide-react";

import { AssistantDeleteAllDialog } from "@/components/commons/assistant/assistant-delete-all-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteAssistantConversation } from "@/hooks/mutations/use-delete-assistant-conversation";
import { useDeleteAssistantConversations } from "@/hooks/mutations/use-delete-assistant-conversations";
import { useAssistantConversations } from "@/hooks/queries/use-assistant-conversations";
import { useAssistantStore } from "@/stores/assistant";

const SKELETON_ROWS = [0, 1, 2];

export const AssistantHistoryMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const selectConversation = useAssistantStore((state) => state.selectConversation);
  const startNewConversation = useAssistantStore((state) => state.startNewConversation);
  const { data: conversations, isLoading: isLoadingConversations } = useAssistantConversations(isOpen);
  const { mutate: deleteConversation } = useDeleteAssistantConversation();
  const { mutate: deleteConversations } = useDeleteAssistantConversations();

  const currentConversationId = () => {
    const { conversationId, selectedConversationId } = useAssistantStore.getState();
    return conversationId ?? selectedConversationId;
  };

  const removeConversation = (id: string) => {
    const remaining = (conversations ?? []).filter((conversation) => conversation.id !== id);
    if (currentConversationId() === id) {
      const [newest] = remaining;
      if (newest) selectConversation(newest.id);
      else startNewConversation();
    }
    deleteConversation(id);
  };

  const removeAll = () => {
    deleteConversations(currentConversationId());
    setIsConfirmingDeleteAll(false);
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Chat history">
            <History aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold">Recent chats</span>
            <Button
              type="button"
              variant="none"
              size="sm"
              className="h-6 px-2 text-xs font-medium text-slate-500 hover:translate-y-0 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
              disabled={(conversations?.length ?? 0) <= (currentConversationId() ? 1 : 0)}
              onClick={() => {
                setIsOpen(false);
                setIsConfirmingDeleteAll(true);
              }}
            >
              Delete all
            </Button>
          </div>
          <DropdownMenuSeparator />
          {isLoadingConversations
            ? SKELETON_ROWS.map((row) => <Skeleton key={row} className="mx-2 my-2 h-5" />)
            : null}
          {conversations?.length === 0 ? <p className="text-muted-foreground px-2 py-1.5 text-sm">No chats yet</p> : null}
          {conversations?.map((conversation) => (
            <div key={conversation.id} className="flex items-center gap-1">
              <DropdownMenuItem className="min-w-0 flex-1" onSelect={() => selectConversation(conversation.id)}>
                <span className="truncate">{conversation.title}</span>
              </DropdownMenuItem>
              <Button
                type="button"
                variant="none"
                size="icon-sm"
                aria-label={`Delete chat ${conversation.title}`}
                className="size-7 text-slate-400 hover:translate-y-0 hover:bg-red-50 hover:text-red-600"
                onClick={() => removeConversation(conversation.id)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <AssistantDeleteAllDialog open={isConfirmingDeleteAll} onOpenChange={setIsConfirmingDeleteAll} onConfirm={removeAll} />
    </>
  );
};
