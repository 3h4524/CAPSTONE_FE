"use client";

import axios from "axios";

import { assistantKeys } from "@/api/assistant";
import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useConfirmAssistantAction } from "@/hooks/mutations/use-confirm-assistant-action";
import { useRejectAssistantAction } from "@/hooks/mutations/use-reject-assistant-action";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantPendingAction } from "@/types/assistant";

const CONFLICT_STATUS = 409;

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
  const client = useAppQueryClient();
  const conversationId = useAssistantStore((state) => state.conversationId);
  const { mutate: confirmAction, isPending: isConfirming } = useConfirmAssistantAction();
  const { mutate: rejectAction, isPending: isRejecting } = useRejectAssistantAction();
  const isBusy = isConfirming || isRejecting;

  const reloadOnConflict = (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === CONFLICT_STATUS) {
      void client.invalidateQueries({ queryKey: assistantKeys.conversation(conversationId) });
      return;
    }
    showToast("error", getErrorMessage(error));
  };

  return (
    <Card className="gap-2 py-3">
      <CardHeader className="gap-1 px-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{action.title}</CardTitle>
          <Badge variant={action.status === "failed" ? "destructive" : "secondary"}>{STATUS_TEXT[action.status]}</Badge>
        </div>
        <CardDescription className="text-xs">{action.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2 px-3">
        {action.status === "pending" ? (
          <>
            <AssistantChip
              label="Confirm"
              variant="default"
              disabled={isBusy}
              onClick={() => confirmAction(action.id, { onError: reloadOnConflict })}
            />
            <AssistantChip
              label="Cancel"
              variant="ghost"
              disabled={isBusy}
              onClick={() => rejectAction(action.id, { onError: reloadOnConflict })}
            />
          </>
        ) : null}
        {action.status === "executing" ? <Spinner className="size-4" /> : null}
        {action.status === "failed" && action.errorMessage ? (
          <p className="text-destructive text-xs">{action.errorMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
};
