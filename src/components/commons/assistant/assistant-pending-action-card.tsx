"use client";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { AssistantNavigateChip } from "@/components/commons/assistant/assistant-navigate-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toAssistantUiMessage } from "@/helpers/assistant-messages";
import { formatActionTimeLeft, getConflictedActionStatus, getPendingActionLink } from "@/helpers/assistant-pending-action";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useConfirmAssistantAction } from "@/hooks/mutations/use-confirm-assistant-action";
import { useRejectAssistantAction } from "@/hooks/mutations/use-reject-assistant-action";
import { useAssistantActionCountdown } from "@/hooks/use-assistant-action-countdown";
import { useRefreshAssistantPendingActions } from "@/hooks/use-refresh-assistant-pending-actions";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantActionResult, AssistantPendingAction } from "@/types/assistant";

const STATUS_TEXT: Record<AssistantPendingAction["status"], string> = {
  pending: "Needs confirmation",
  executing: "Running",
  executed: "Done",
  rejected: "Cancelled",
  expired: "Expired. Ask again.",
  failed: "Failed",
};

type AssistantPendingActionCardProps = {
  action: AssistantPendingAction;
};

export const AssistantPendingActionCard = ({ action }: AssistantPendingActionCardProps) => {
  const conversationId = useAssistantStore((state) => state.conversationId ?? state.selectedConversationId);
  const upsertPendingAction = useAssistantStore((state) => state.upsertPendingAction);
  const appendMessage = useAssistantStore((state) => state.appendMessage);
  const refreshPendingActions = useRefreshAssistantPendingActions();
  const { mutate: confirmAction, isPending: isConfirming } = useConfirmAssistantAction();
  const { mutate: rejectAction, isPending: isRejecting } = useRejectAssistantAction();
  const { remainingMs, isExpired } = useAssistantActionCountdown(action.expiresAt, action.status === "pending");
  const status = action.status === "pending" && isExpired ? "expired" : action.status;
  const link = getPendingActionLink(action);
  const isBusy = isConfirming || isRejecting;

  const applyResult = (result: AssistantActionResult) => {
    upsertPendingAction(result.action);
    appendMessage(toAssistantUiMessage(result.message));
  };

  const handleError = (error: unknown) => {
    showToast("error", getErrorMessage(error));
    const conflictedStatus = getConflictedActionStatus(error);
    if (conflictedStatus === null) return;
    upsertPendingAction({ ...action, status: conflictedStatus });
    refreshPendingActions(conversationId);
  };

  return (
    <Card className="gap-2 py-3">
      <CardHeader className="gap-1 px-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{action.title}</CardTitle>
          <Badge variant={status === "failed" ? "destructive" : "secondary"}>{STATUS_TEXT[status]}</Badge>
        </div>
        <CardDescription className="text-xs">{action.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2 px-3">
        {status === "pending" ? (
          <>
            <AssistantChip
              label="Confirm"
              variant="default"
              disabled={isBusy}
              onClick={() => confirmAction(action.id, { onSuccess: applyResult, onError: handleError })}
            />
            <AssistantChip
              label="Cancel"
              variant="ghost"
              disabled={isBusy}
              onClick={() => rejectAction(action.id, { onSuccess: applyResult, onError: handleError })}
            />
            {remainingMs === null ? null : (
              <span className="text-muted-foreground text-xs">{formatActionTimeLeft(remainingMs)}</span>
            )}
          </>
        ) : null}
        {status === "executing" ? <Spinner className="size-4" /> : null}
        {status === "failed" && action.errorMessage ? <p className="text-destructive text-xs">{action.errorMessage}</p> : null}
        {link ? <AssistantNavigateChip payload={link} /> : null}
      </CardContent>
    </Card>
  );
};
