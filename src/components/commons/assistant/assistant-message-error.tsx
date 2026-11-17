"use client";

import { useTranslation } from "react-i18next";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { ASSISTANT_BLOCKED_ERROR_CODE } from "@/constants/assistant";
import { isLatestFailedReply } from "@/helpers/assistant-reducer";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantError } from "@/types/assistant";

type AssistantMessageErrorProps = {
  messageKey: string;
  error: AssistantError;
};

export const AssistantMessageError = ({ messageKey, error }: AssistantMessageErrorProps) => {
  const { t } = useTranslation("common");
  const { retry, isStreaming } = useAssistantChat();
  const isLatestFailure = useAssistantStore((state) => isLatestFailedReply(state.messages, messageKey));
  const canRetry = isLatestFailure && error.code !== ASSISTANT_BLOCKED_ERROR_CODE;

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-destructive text-xs">{error.message}</p>
      {canRetry ? <AssistantChip label={t("commons.assistant.retry")} disabled={isStreaming} onClick={() => retry(messageKey)} /> : null}
    </div>
  );
};
