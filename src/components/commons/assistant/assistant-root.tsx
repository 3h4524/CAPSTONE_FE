"use client";

import { useEffect } from "react";

import { AssistantBubble } from "@/components/commons/assistant/assistant-bubble";
import { AssistantLauncher } from "@/components/commons/assistant/assistant-launcher";
import { AssistantPanel } from "@/components/commons/assistant/assistant-panel";
import { loadDisplayMode } from "@/helpers/assistant-display-mode";
import { useAssistantStore } from "@/stores/assistant";
import { useAuthStore } from "@/stores/auth";

export const AssistantRoot = () => {
  const user = useAuthStore((state) => state.user);
  const setDisplayMode = useAssistantStore((state) => state.setDisplayMode);

  useEffect(() => {
    const stored = loadDisplayMode();
    if (stored) setDisplayMode(stored);
  }, [setDisplayMode]);

  if (!user) return null;

  return (
    <>
      <AssistantLauncher />
      <AssistantPanel />
      <AssistantBubble />
    </>
  );
};
