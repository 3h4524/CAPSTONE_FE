"use client";

import { usePathname } from "next/navigation";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { arrangeNodes, describeArrangement } from "@/helpers/assistant-canvas-layout";
import { showToast } from "@/helpers/toast";
import { useSetAssistantClientActionState } from "@/hooks/mutations/use-set-assistant-client-action-state";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";
import type { AssistantArrangePayload, AssistantClientActionState } from "@/types/assistant";

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
  const setClientActionState = useAssistantStore((store) => store.setClientActionState);
  const isStreaming = useAssistantStore((store) => store.streamingMessageId !== null);
  const { mutate: saveActionState } = useSetAssistantClientActionState();
  const canApply = pathname === "/workflows" && workflowId === payload.workflowId && !isStreaming;

  const settle = (next: "applied" | "dismissed") => {
    setClientActionState(messageId, actionId, next);
    saveActionState({ messageId, actionId, state: next });
  };

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
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Proposed layout</p>
        <p className="text-sm text-slate-800">{describeArrangement(payload)}</p>
        <p className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">Only the positions of the nodes change.</p>
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
          <p className="text-xs font-medium text-slate-500">{STATE_TEXT[state]}</p>
        )}
      </CardContent>
    </Card>
  );
};
