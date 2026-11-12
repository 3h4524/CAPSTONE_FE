"use client";

import { useEffect } from "react";

import { loadAssistantDrafts, saveAssistantDrafts } from "@/helpers/assistant-drafts";
import {
  loadSelectedConversationId,
  saveSelectedConversationId,
  selectCurrentConversationId,
} from "@/helpers/assistant-selected-conversation";
import { detachFromActiveStream } from "@/hooks/use-assistant-chat";
import { useAssistantStore } from "@/stores/assistant";

export const useAssistantUserSession = (userId: string | null) => {
  const switchSessionUser = useAssistantStore((state) => state.switchSessionUser);
  const hydrateDrafts = useAssistantStore((state) => state.hydrateDrafts);
  const restoreSelectedConversation = useAssistantStore((state) => state.restoreSelectedConversation);

  useEffect(() => {
    if (useAssistantStore.getState().sessionUserId !== userId) {
      detachFromActiveStream();
      switchSessionUser(userId);
    }
    if (userId === null) return;
    hydrateDrafts(loadAssistantDrafts(userId));
    restoreSelectedConversation(loadSelectedConversationId(userId));
    return useAssistantStore.subscribe((state, previous) => {
      if (state.drafts !== previous.drafts) saveAssistantDrafts(userId, state.drafts);
      const currentId = selectCurrentConversationId(state);
      if (currentId !== selectCurrentConversationId(previous)) saveSelectedConversationId(userId, currentId);
    });
  }, [userId, switchSessionUser, hydrateDrafts, restoreSelectedConversation]);
};
