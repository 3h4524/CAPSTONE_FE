"use client";

import { usePathname } from "next/navigation";

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

const STATE_TEXT: Record<Exclude<AssistantClientActionState, "idle">, string> = {
  applied: "Applied",
  dismissed: "Dismissed",
};

export const AssistantArrangeCard = ({ messageId, actionId, payload, state }: AssistantArrangeCardProps) => {
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
    showToast("success", "Layout updated. Remember to save.");
  };

  return (
    <Card className="gap-0 rounded-xl py-3 shadow-none">
      <CardContent className="flex flex-col gap-2.5 px-3">
        <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">Proposed layout</p>
        <p className="text-ink-800 text-sm">{describeArrangement(payload)}</p>
        <p className="bg-ink-50 text-ink-600 rounded-md px-2 py-1 text-xs">Only the positions of the nodes change.</p>
        {state === "idle" ? (
          <div className="flex flex-wrap gap-2 pt-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <AssistantChip label="Apply layout" variant="default" disabled={!canApply} onClick={apply} />
                  </span>
                </TooltipTrigger>
                {canApply ? null : <TooltipContent>Open this workflow to apply</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <AssistantChip label="Dismiss" variant="ghost" disabled={isStreaming} onClick={() => settle("dismissed")} />
          </div>
        ) : (
          <p className="text-ink-500 text-xs font-medium">{STATE_TEXT[state]}</p>
        )}
      </CardContent>
    </Card>
  );
};
