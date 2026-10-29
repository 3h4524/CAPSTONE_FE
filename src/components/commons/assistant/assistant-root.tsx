"use client";

import { AssistantLauncher } from "@/components/commons/assistant/assistant-launcher";
import { AssistantPanel } from "@/components/commons/assistant/assistant-panel";
import { useAuthStore } from "@/stores/auth";

export const AssistantRoot = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <>
      <AssistantLauncher />
      <AssistantPanel />
    </>
  );
};
