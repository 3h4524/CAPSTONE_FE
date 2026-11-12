"use client";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { isLatestFailedReply } from "@/helpers/assistant-reducer";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantError } from "@/types/assistant";

type AssistantMessageErrorProps = {
  messageKey: string;
  error: AssistantError;
};

export const AssistantMessageError = ({ messageKey, error }: AssistantMessageErrorProps) => {
  const { retry, isStreaming } = useAssistantChat();
  const canRetry = useAssistantStore((state) => isLatestFailedReply(state.messages, messageKey));

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-destructive text-xs">{error.message}</p>
      {canRetry ? <AssistantChip label="Retry" disabled={isStreaming} onClick={() => retry(messageKey)} /> : null}
    </div>
  );
};
