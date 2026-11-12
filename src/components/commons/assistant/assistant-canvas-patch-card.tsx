"use client";

import { usePathname } from "next/navigation";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { describeCanvasChange } from "@/helpers/assistant-canvas-changes";
import { applyCanvasPatch } from "@/helpers/assistant-canvas-patch";
import { showToast } from "@/helpers/toast";
import { useSettleAssistantClientAction } from "@/hooks/use-settle-assistant-client-action";
import { useWorkflowStore } from "@/stores/workflow";
import type { AssistantCanvasPatchPayload, AssistantClientActionDecision, AssistantClientActionState } from "@/types/assistant";
import type { WorkflowNode } from "@/types/workflow";

type AssistantCanvasPatchCardProps = {
  messageId: string;
  actionId: string;
  payload: AssistantCanvasPatchPayload;
  state: AssistantClientActionState;
};

const changedNodeIds = (before: WorkflowNode[], after: WorkflowNode[], payload: AssistantCanvasPatchPayload) => {
  const known = new Set(before.map((node) => node.id));
  const added = after.filter((node) => !known.has(node.id)).map((node) => node.id);
  const edited = payload.operations.flatMap((operation) =>
    operation.op === "update_config" && operation.nodeId && known.has(operation.nodeId) ? [operation.nodeId] : []
  );
  return [...new Set([...added, ...edited])];
};

const STATE_TEXT: Record<Exclude<AssistantClientActionState, "idle">, string> = {
  applied: "Applied",
  dismissed: "Dismissed",
};

export const AssistantCanvasPatchCard = ({ messageId, actionId, payload, state }: AssistantCanvasPatchCardProps) => {
  const pathname = usePathname();
  const nodes = useWorkflowStore((store) => store.nodes);
  const workflowId = useWorkflowStore((store) => store.workflowId);
  const applyGraphPatch = useWorkflowStore((store) => store.applyGraphPatch);
  const settleClientAction = useSettleAssistantClientAction();
  const canApply = pathname === "/workflows" && workflowId === payload.workflowId;
  const changes = payload.operations.map((operation) => describeCanvasChange(operation, nodes, payload.operations));

  const settle = (next: AssistantClientActionDecision) => settleClientAction(messageId, actionId, next);

  const apply = () => {
    const { nodes: currentNodes, edges: currentEdges } = useWorkflowStore.getState();
    const result = applyCanvasPatch(currentNodes, currentEdges, payload.operations);
    if (result.applied > 0) applyGraphPatch(result.nodes, result.edges, changedNodeIds(currentNodes, result.nodes, payload));
    settle("applied");
    if (result.skipped.length === 0) {
      showToast("success", "Changes applied. Remember to save.");
      return;
    }
    const reasons = result.skipped.map((skip) => skip.reason).join("; ");
    showToast("warning", `${result.skipped.length} change(s) skipped: ${reasons}`);
  };

  return (
    <Card className="gap-0 rounded-xl py-3 shadow-none">
      <CardContent className="flex flex-col gap-2.5 px-3">
      <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">Proposed canvas changes</p>
      <ul className="text-ink-800 flex flex-col gap-1.5 text-sm">
        {changes.map((change, index) => (
          <li key={`${change.title}-${index}`} className="flex flex-col gap-0.5">
            <span>{change.title}</span>
            {change.details.map((detail) => (
              <span key={detail} className="bg-ink-50 text-ink-600 rounded-md px-2 py-1 text-xs">
                {detail}
              </span>
            ))}
          </li>
        ))}
      </ul>
      {payload.warnings.map((warning) => (
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
                  <AssistantChip label="Apply to canvas" variant="default" disabled={!canApply} onClick={apply} />
                </span>
              </TooltipTrigger>
              {canApply ? null : <TooltipContent>Open this workflow to apply</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
          <AssistantChip label="Dismiss" variant="ghost" onClick={() => settle("dismissed")} />
        </div>
      ) : (
        <p className="text-ink-500 text-xs font-medium">{STATE_TEXT[state]}</p>
      )}
      </CardContent>
    </Card>
  );
};
