"use client";

import { useEffect } from "react";

import { AssistantBubble } from "@/components/commons/assistant/assistant-bubble";
import { AssistantLauncher } from "@/components/commons/assistant/assistant-launcher";
import { AssistantPanel } from "@/components/commons/assistant/assistant-panel";
import { loadDisplayMode } from "@/helpers/assistant-display-mode";
import { loadAssistantDrafts, saveAssistantDrafts } from "@/helpers/assistant-drafts";
import { useAssistantStore } from "@/stores/assistant";
import { useAuthStore } from "@/stores/auth";

export const AssistantRoot = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const setDisplayMode = useAssistantStore((state) => state.setDisplayMode);
  const hydrateDrafts = useAssistantStore((state) => state.hydrateDrafts);

  useEffect(() => {
    const stored = loadDisplayMode();
    if (stored) setDisplayMode(stored);
  }, [setDisplayMode]);

  useEffect(() => {
    if (userId === null) return;
    hydrateDrafts(loadAssistantDrafts(userId));
    return useAssistantStore.subscribe((state, previous) => {
      if (state.drafts !== previous.drafts) saveAssistantDrafts(userId, state.drafts);
    });
  }, [userId, hydrateDrafts]);

  if (!user) return null;

  return (
    <>
      <AssistantLauncher />
      <AssistantPanel />
      <AssistantBubble />
    </>
  );
};
