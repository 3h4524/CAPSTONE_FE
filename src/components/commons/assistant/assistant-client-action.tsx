import { AssistantCanvasPatchCard } from "@/components/commons/assistant/assistant-canvas-patch-card";
import { AssistantNavigateChip } from "@/components/commons/assistant/assistant-navigate-chip";
import type { AssistantClientAction, AssistantClientActionState } from "@/types/assistant";

type AssistantClientActionViewProps = {
  messageId: string;
  action: AssistantClientAction;
  state: AssistantClientActionState;
};

export const AssistantClientActionView = ({ messageId, action, state }: AssistantClientActionViewProps) => {
  if (action.kind === "navigate") return <AssistantNavigateChip payload={action.payload} />;
  return <AssistantCanvasPatchCard messageId={messageId} actionId={action.id} payload={action.payload} state={state} />;
};
