"use client";

import { usePathname } from "next/navigation";

import { AssistantChip } from "@/components/commons/assistant/assistant-chip";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { describeCanvasChange } from "@/helpers/assistant-canvas-changes";
import { applyCanvasPatch } from "@/helpers/assistant-canvas-patch";
import { showToast } from "@/helpers/toast";
import { useSetAssistantClientActionState } from "@/hooks/mutations/use-set-assistant-client-action-state";
import { useAssistantStore } from "@/stores/assistant";
import { useWorkflowStore } from "@/stores/workflow";
import type { AssistantCanvasPatchPayload, AssistantClientActionState } from "@/types/assistant";
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
  const setClientActionState = useAssistantStore((store) => store.setClientActionState);
  const isStreaming = useAssistantStore((store) => store.streamingMessageId !== null);
  const { mutate: saveActionState } = useSetAssistantClientActionState();
  const canApply = pathname === "/workflows" && workflowId === payload.workflowId && !isStreaming;
  const changes = payload.operations.map((operation) => describeCanvasChange(operation, nodes));

  const settle = (next: "applied" | "dismissed") => {
    setClientActionState(messageId, actionId, next);
    saveActionState({ messageId, actionId, state: next });
  };

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
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Proposed canvas changes</p>
      <ul className="flex flex-col gap-1.5 text-sm text-slate-800">
        {changes.map((change, index) => (
          <li key={`${change.title}-${index}`} className="flex flex-col gap-0.5">
            <span>{change.title}</span>
            {change.details.map((detail) => (
              <span key={detail} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">
                {detail}
              </span>
            ))}
          </li>
        ))}
      </ul>
      {payload.warnings.map((warning) => (
        <p key={warning} className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
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
          <AssistantChip label="Dismiss" variant="ghost" disabled={isStreaming} onClick={() => settle("dismissed")} />
        </div>
      ) : (
        <p className="text-xs font-medium text-slate-500">{STATE_TEXT[state]}</p>
      )}
      </CardContent>
    </Card>
  );
};
