"use client";

import { usePathname } from "next/navigation";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettleAssistantClientAction } from "@/hooks/use-settle-assistant-client-action";
import { useAssistantStore } from "@/stores/assistant";
import { useAssistantRunNudgeStore } from "@/stores/assistant-run-nudge";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowCommandStore, type WorkflowCommand, type WorkflowCommandKind } from "@/stores/workflow-command";
import type { AssistantClientActionDecision, AssistantClientActionState } from "@/types/assistant";

type AssistantWorkflowCommandCardProps = {
  messageId: string;
  actionId: string;
  kind: WorkflowCommandKind;
  workflowId: string;
  workflowName: string;
  warnings?: string[];
  continueLabel?: string;
  runRef?: Pick<WorkflowCommand, "stage" | "batchJobId" | "runGroupId" | "runId">;
  state: AssistantClientActionState;
};

const STATE_TEXT: Record<WorkflowCommandKind, Record<AssistantClientActionDecision, string>> = {
  run: { applied: "Run requested", dismissed: "Dismissed" },
  save: { applied: "Save requested", dismissed: "Dismissed" },
  continue: { applied: "Continue requested", dismissed: "Dismissed" },
};

const TITLE: Record<WorkflowCommandKind, string> = { run: "Run workflow", save: "Save workflow", continue: "Continue run" };

export const AssistantWorkflowCommandCard = ({
  messageId,
  actionId,
  kind,
  workflowId,
  workflowName,
  warnings = [],
  continueLabel = "Continue",
  runRef,
  state,
}: AssistantWorkflowCommandCardProps) => {
  const pathname = usePathname();
  const openWorkflowId = useWorkflowStore((store) => store.workflowId);
  const isDirty = useWorkflowStore((store) => store.isDirty);
  const requestCommand = useWorkflowCommandStore((store) => store.request);
  const watchRun = useAssistantRunNudgeStore((store) => store.watch);
  const settleClientAction = useSettleAssistantClientAction();
  const isStreaming = useAssistantStore((store) => store.streamingMessageId !== null);
  const isOpen = pathname === "/workflows" && openWorkflowId === workflowId;
  const canAct = isOpen && !isStreaming && (kind !== "save" || isDirty);
  const buttonLabel = kind === "save" ? "Save" : kind === "continue" ? continueLabel : isDirty ? "Save and run" : "Run workflow";

  const settle = (next: AssistantClientActionDecision) => settleClientAction(messageId, actionId, next);

  const act = () => {
    requestCommand({ id: actionId, workflowId, kind, ...runRef });
    if (kind !== "save") watchRun(workflowId);
    settle("applied");
  };

  return (
    <Card className="gap-0 rounded-xl py-3 shadow-none">
      <CardContent className="flex flex-col gap-2.5 px-3">
        <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">{TITLE[kind]}</p>
        <p className="text-ink-800 text-sm">{workflowName}</p>
        {kind !== "save" ? (
          <p className="bg-ink-50 text-ink-600 rounded-md px-2 py-1 text-xs">Paid steps show their cost for you to confirm first.</p>
        ) : null}
        {warnings.map((warning) => (
          <p key={warning} className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {warning}
          </p>
        ))}
        {state === "idle" ? (
          <div className="flex flex-wrap gap-2 pt-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <AssistantChip label={buttonLabel} variant="default" disabled={!canAct} onClick={act} />
                  </span>
                </TooltipTrigger>
                {isOpen ? null : <TooltipContent>Open this workflow first</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <AssistantChip label="Dismiss" variant="ghost" disabled={isStreaming} onClick={() => settle("dismissed")} />
          </div>
        ) : (
          <p className="text-ink-500 text-xs font-medium">{STATE_TEXT[kind][state]}</p>
        )}
      </CardContent>
    </Card>
  );
};
