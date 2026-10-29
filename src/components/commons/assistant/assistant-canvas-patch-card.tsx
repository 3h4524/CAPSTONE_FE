"use client";

import { usePathname } from "next/navigation";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { applyCanvasPatch, describeCanvasOperation } from "@/helpers/assistant-canvas-patch";
import { showToast } from "@/helpers/toast";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";
import type { AssistantCanvasPatchPayload, AssistantClientActionState } from "@/types/assistant";

type AssistantCanvasPatchCardProps = {
  messageId: string;
  actionId: string;
  payload: AssistantCanvasPatchPayload;
  state: AssistantClientActionState;
};

export const AssistantCanvasPatchCard = ({ messageId, actionId, payload, state }: AssistantCanvasPatchCardProps) => {
  const pathname = usePathname();
  const nodes = useWorkflowStore((store) => store.nodes);
  const workflowId = useWorkflowStore((store) => store.workflowId);
  const applyGraphPatch = useWorkflowStore((store) => store.applyGraphPatch);
  const setClientActionState = useAssistantStore((store) => store.setClientActionState);
  const canApply = pathname === "/workflows" && workflowId === payload.workflowId;

  const apply = () => {
    const { nodes: currentNodes, edges: currentEdges } = useWorkflowStore.getState();
    const result = applyCanvasPatch(currentNodes, currentEdges, payload.operations);
    if (result.applied > 0) applyGraphPatch(result.nodes, result.edges);
    setClientActionState(messageId, actionId, "applied");
    if (result.skipped.length === 0) {
      showToast("success", "Changes applied. Remember to save.");
      return;
    }
    const reasons = result.skipped.map((skip) => skip.reason).join("; ");
    showToast("warning", `${result.skipped.length} change(s) skipped: ${reasons}`);
  };

  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className="text-sm">Proposed canvas changes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-3">
        <ul className="list-disc pl-4 text-xs">
          {payload.operations.map((operation, index) => (
            <li key={`${operation.op}-${index}`}>{describeCanvasOperation(operation, nodes)}</li>
          ))}
        </ul>
        {payload.warnings.map((warning) => (
          <p key={warning} className="text-xs text-amber-600">
            {warning}
          </p>
        ))}
        {state === "idle" ? (
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <AssistantChip label="Apply to canvas" variant="default" disabled={!canApply} onClick={apply} />
                  </span>
                </TooltipTrigger>
                {canApply ? null : <TooltipContent>Open this workflow to apply</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <AssistantChip
              label="Dismiss"
              variant="ghost"
              onClick={() => setClientActionState(messageId, actionId, "dismissed")}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">{state === "applied" ? "Applied" : "Dismissed"}</p>
        )}
      </CardContent>
    </Card>
  );
};
