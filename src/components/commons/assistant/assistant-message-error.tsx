"use client";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import type { AssistantError } from "@/types/assistant";

type AssistantMessageErrorProps = {
  error: AssistantError;
};

export const AssistantMessageError = ({ error }: AssistantMessageErrorProps) => {
  const { retryLast, isStreaming } = useAssistantChat();

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-destructive text-xs">{error.message}</p>
      <AssistantChip label="Retry" disabled={isStreaming} onClick={retryLast} />
    </div>
  );
};
