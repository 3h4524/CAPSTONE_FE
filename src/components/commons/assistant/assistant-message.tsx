"use client";

import { useShallow } from "zustand/react/shallow";

import { AssistantChoiceChips } from "@/components/commons/assistant/assistant-choice-chips";
import { AssistantCitations } from "@/components/commons/assistant/assistant-citations";
import { AssistantClientActionView } from "@/components/commons/assistant/assistant-client-action";
import { AssistantMessageError } from "@/components/commons/assistant/assistant-message-error";
import { AssistantPendingActionCard } from "@/components/commons/assistant/assistant-pending-action-card";
import { AssistantToolStatus } from "@/components/commons/assistant/assistant-tool-status";
import { Spinner } from "@/components/ui/spinner";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantUiMessage } from "@/types/assistant";

type AssistantMessageProps = {
  message: AssistantUiMessage;
};

export const AssistantMessage = ({ message }: AssistantMessageProps) => {
  const pendingActions = useAssistantStore(
    useShallow((state) => message.pendingActionIds.map((id) => state.pendingActions[id]))
  );
  const isUser = message.role === "user";
  const isWaiting = message.isStreaming && !message.content && message.tools.length === 0;

  if (isUser) {
    return (
      <div className="bg-primary text-primary-foreground max-w-[85%] self-end rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap">
        {message.content}
      </div>
    );
  }

  return (
    <div className="flex max-w-[92%] flex-col gap-2 self-start">
      {message.tools.length > 0 ? <AssistantToolStatus tools={message.tools} isStreaming={message.isStreaming} /> : null}
      {isWaiting ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Spinner className="size-3" />
          Thinking…
        </p>
      ) : null}
      {message.content ? (
        <div className="bg-muted rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap">{message.content}</div>
      ) : null}
      {message.citations.length > 0 ? <AssistantCitations citations={message.citations} /> : null}
      {message.clientActions.map((action) => (
        <AssistantClientActionView
          key={action.id}
          messageId={message.id}
          action={action}
          state={message.clientActionStates[action.id] ?? "idle"}
        />
      ))}
      {pendingActions.map((action) =>
        action ? <AssistantPendingActionCard key={action.id} action={action} /> : null
      )}
      {message.choices ? (
        <AssistantChoiceChips messageId={message.id} choices={message.choices} choicesUsed={message.choicesUsed} />
      ) : null}
      {message.error ? <AssistantMessageError error={message.error} /> : null}
    </div>
  );
};
