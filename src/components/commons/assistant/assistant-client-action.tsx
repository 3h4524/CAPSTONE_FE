import { AssistantArrangeCard } from "@/components/commons/assistant/assistant-arrange-card";
import { AssistantCanvasPatchCard } from "@/components/commons/assistant/assistant-canvas-patch-card";
import { AssistantNavigateChip } from "@/components/commons/assistant/assistant-navigate-chip";
import { AssistantWorkflowCommandCard } from "@/components/commons/assistant/assistant-workflow-command-card";
import type { AssistantClientAction, AssistantClientActionState } from "@/types/assistant";

type AssistantClientActionViewProps = {
  messageId: string;
  action: AssistantClientAction;
  state: AssistantClientActionState;
};

export const AssistantClientActionView = ({ messageId, action, state }: AssistantClientActionViewProps) => {
  if (action.kind === "navigate") return <AssistantNavigateChip payload={action.payload} />;
  if (action.kind === "run_workflow" || action.kind === "save_workflow") {
    return (
      <AssistantWorkflowCommandCard
        messageId={messageId}
        actionId={action.id}
        kind={action.kind === "run_workflow" ? "run" : "save"}
        workflowId={action.payload.workflowId}
        workflowName={action.payload.workflowName}
        warnings={action.kind === "run_workflow" ? action.payload.warnings : []}
        state={state}
      />
    );
  }
  if (action.kind === "arrange_workflow_canvas") {
    return <AssistantArrangeCard messageId={messageId} actionId={action.id} payload={action.payload} state={state} />;
  }
  return <AssistantCanvasPatchCard messageId={messageId} actionId={action.id} payload={action.payload} state={state} />;
};
