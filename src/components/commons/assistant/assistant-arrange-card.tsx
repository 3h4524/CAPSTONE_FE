"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { arrangeNodes, describeArrangement } from "@/helpers/assistant-canvas-layout";
import { showToast } from "@/helpers/toast";
import { useSettleAssistantClientAction } from "@/hooks/use-settle-assistant-client-action";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";
import type { AssistantArrangePayload, AssistantClientActionDecision, AssistantClientActionState } from "@/types/assistant";

type AssistantArrangeCardProps = {
  messageId: string;
  actionId: string;
  payload: AssistantArrangePayload;
  state: AssistantClientActionState;
};



export const AssistantArrangeCard = ({ messageId, actionId, payload, state }: AssistantArrangeCardProps) => {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const workflowId = useWorkflowStore((store) => store.workflowId);
  const applyGraphPatch = useWorkflowStore((store) => store.applyGraphPatch);
  const settleClientAction = useSettleAssistantClientAction();
  const isStreaming = useAssistantStore((store) => store.streamingMessageId !== null);
  const canApply = pathname === "/workflows" && workflowId === payload.workflowId && !isStreaming;

  const settle = (next: AssistantClientActionDecision) => settleClientAction(messageId, actionId, next);

  const apply = () => {
    const { nodes, edges } = useWorkflowStore.getState();
    const arranged = arrangeNodes(nodes, edges, payload);
    applyGraphPatch(arranged, edges, arranged.map((node) => node.id));
    settle("applied");
    showToast("success", t("commons.assistant.cards.layoutUpdated"));
  };

  return (
    <Card className="gap-0 rounded-xl py-3 shadow-none">
      <CardContent className="flex flex-col gap-2.5 px-3">
        <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">{t("commons.assistant.cards.proposedLayout")}</p>
        <p className="text-ink-800 text-sm">{describeArrangement(payload)}</p>
        <p className="bg-ink-50 text-ink-600 rounded-md px-2 py-1 text-xs">{t("commons.assistant.cards.positionsOnly")}</p>
        {state === "idle" ? (
          <div className="flex flex-wrap gap-2 pt-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <AssistantChip label={t("commons.assistant.cards.applyLayout")} variant="default" disabled={!canApply} onClick={apply} />
                  </span>
                </TooltipTrigger>
                {canApply ? null : <TooltipContent>{t("commons.assistant.cards.openToApply")}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <AssistantChip label={t("commons.assistant.cards.dismiss")} variant="ghost" disabled={isStreaming} onClick={() => settle("dismissed")} />
          </div>
        ) : (
          <p className="text-ink-500 text-xs font-medium">{t(`commons.assistant.cards.states.${state}`)}</p>
        )}
      </CardContent>
    </Card>
  );
};
