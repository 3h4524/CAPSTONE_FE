import type { z } from "zod";

import type { assistantStreamEventSchema } from "@/schemas/assistant";
import type { WorkflowNodeType } from "@/types/workflow";

export type AssistantStreamEvent = z.infer<typeof assistantStreamEventSchema>;

export type AssistantRole = "user" | "assistant";

export type AssistantCitation = { documentId: string; title: string; sourceUrl: string | null };

export type AssistantChoiceOption = { label: string; value: string };

export type AssistantChoices = { question: string | null; options: AssistantChoiceOption[]; allowFreeText: boolean };

export type AssistantCanvasOperationKind = "add_node" | "remove_node" | "connect" | "disconnect" | "update_config" | "rename_node";

export type AssistantCanvasOperation = {
  op: AssistantCanvasOperationKind;
  ref?: string | null;
  type?: WorkflowNodeType | null;
  label?: string | null;
  after?: string | null;
  nodeId?: string | null;
  source?: string | null;
  target?: string | null;
  config?: Record<string, unknown> | null;
};

export type AssistantCanvasPatchPayload = { workflowId: string; operations: AssistantCanvasOperation[]; warnings: string[] };

export type AssistantArrangeLayout = "horizontal" | "vertical" | "grid";

export type AssistantArrangeSpacing = "compact" | "comfortable" | "wide";

export type AssistantArrangePayload = {
  workflowId: string;
  layout: AssistantArrangeLayout;
  spacing: AssistantArrangeSpacing;
  perRow: number;
  nodeCount: number;
};

export type AssistantNavigatePayload = { path: string; label: string };

export type AssistantClientAction =
  | { id: string; kind: "edit_workflow_canvas"; payload: AssistantCanvasPatchPayload }
  | { id: string; kind: "arrange_workflow_canvas"; payload: AssistantArrangePayload }
  | { id: string; kind: "navigate"; payload: AssistantNavigatePayload };

export type AssistantClientActionState = "idle" | "applied" | "dismissed";

export type AssistantPendingActionStatus = "pending" | "executing" | "executed" | "rejected" | "expired" | "failed";

export type AssistantPendingAction = {
  id: string;
  toolName: string;
  title: string;
  summary: string;
  status: AssistantPendingActionStatus;
  expiresAt: string;
  result?: unknown;
  errorMessage?: string | null;
};

export type AssistantToolActivity = { callId: string; name: string; status: "running" | "ok" | "failed" };

export type AssistantError = { code: string; message: string };

export type AssistantUiMessage = {
  id: string;
  role: AssistantRole;
  content: string;
  citations: AssistantCitation[];
  choices: AssistantChoices | null;
  choicesUsed: boolean;
  clientActions: AssistantClientAction[];
  clientActionStates: Record<string, AssistantClientActionState>;
  pendingActionIds: string[];
  tools: AssistantToolActivity[];
  error: AssistantError | null;
  isStreaming: boolean;
  createdAt: string;
};

export type AssistantCanvasContext = {
  workflowId: string;
  revision: number;
  isDirty: boolean;
  nodes: { id: string; type: WorkflowNodeType; label: string; config: Record<string, unknown> }[];
  edges: { id: string; source: string; target: string }[];
};

export type AssistantClientContext = {
  route: string;
  workflowId: string | null;
  runId: string | null;
  selectedNodeIds: string[];
  canvas: AssistantCanvasContext | null;
};

export type SendAssistantMessageInput = { conversationId: string | null; message: string; context: AssistantClientContext | null };

export type AssistantConversationSummary = { id: string; title: string; updatedAt: string };

export type AssistantMessageDto = { id: string; role: AssistantRole; content: string; metadata: Record<string, unknown>; createdAt: string };

export type AssistantConversationDetail = {
  id: string;
  title: string;
  messages: AssistantMessageDto[];
  pendingActions: AssistantPendingAction[];
};

export type AssistantActionResult = { action: AssistantPendingAction; message: AssistantMessageDto };
