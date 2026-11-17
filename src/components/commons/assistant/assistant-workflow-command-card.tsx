"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { validateWorkflow } from "@/helpers/workflow-graph";
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

const MAX_LIVE_WARNINGS = 2;

export const AssistantWorkflowCommandCard = ({
  messageId,
  actionId,
  kind,
  workflowId,
  workflowName,
  warnings = [],
  continueLabel,
  runRef,
  state,
}: AssistantWorkflowCommandCardProps) => {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const openWorkflowId = useWorkflowStore((store) => store.workflowId);
  const isDirty = useWorkflowStore((store) => store.isDirty);
  const requestCommand = useWorkflowCommandStore((store) => store.request);
  const watchRun = useAssistantRunNudgeStore((store) => store.watch);
  const settleClientAction = useSettleAssistantClientAction();
  const isStreaming = useAssistantStore((store) => store.streamingMessageId !== null);
  const nodes = useWorkflowStore((store) => store.nodes);
  const edges = useWorkflowStore((store) => store.edges);
  const isOpen = pathname === "/workflows" && openWorkflowId === workflowId;
  const shownWarnings =
    kind === "run" && isOpen
      ? validateWorkflow(nodes, edges)
          .slice(0, MAX_LIVE_WARNINGS)
          .map((issue) => issue.message)
      : warnings;
  const canAct = isOpen && !isStreaming && (kind !== "save" || isDirty);
  const buttonLabel =
    kind === "save"
      ? t("commons.assistant.command.save")
      : kind === "continue"
        ? (continueLabel ?? t("commons.assistant.command.continue"))
        : isDirty
          ? t("commons.assistant.command.saveAndRun")
          : t("commons.assistant.command.titles.run");

  const settle = (next: AssistantClientActionDecision) => settleClientAction(messageId, actionId, next);

  const act = () => {
    requestCommand({ id: actionId, workflowId, kind, ...runRef });
    if (kind !== "save") watchRun(workflowId);
    settle("applied");
  };

  return (
    <Card className="gap-0 rounded-xl py-3 shadow-none">
      <CardContent className="flex flex-col gap-2.5 px-3">
        <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">{t(`commons.assistant.command.titles.${kind}`)}</p>
        <p className="text-ink-800 text-sm">{workflowName}</p>
        {kind !== "save" ? (
          <p className="bg-ink-50 text-ink-600 rounded-md px-2 py-1 text-xs">{t("commons.assistant.command.paidSteps")}</p>
        ) : null}
        {shownWarnings.map((warning) => (
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
                {isOpen ? null : <TooltipContent>{t("commons.assistant.command.openFirst")}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <AssistantChip label={t("commons.assistant.cards.dismiss")} variant="ghost" disabled={isStreaming} onClick={() => settle("dismissed")} />
          </div>
        ) : (
          <p className="text-ink-500 text-xs font-medium">{t(state === "applied" ? `commons.assistant.command.requested.${kind}` : "commons.assistant.cards.states.dismissed")}</p>
        )}
      </CardContent>
    </Card>
  );
};
