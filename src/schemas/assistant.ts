import { z } from "zod";

import { ASSISTANT_MAX_MESSAGE_LENGTH } from "@/constants/assistant";

const citationSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  sourceUrl: z.string().nullable(),
});

const choicesSchema = z.object({
  question: z.string().nullable(),
  options: z.array(z.object({ label: z.string(), value: z.string() })),
  allowFreeText: z.boolean(),
});

const workflowNodeTypeSchema = z.enum([
  "product-input",
  "prompt-synthesis",
  "design-image",
  "design-approval",
  "apply-mockup",
  "approval-gate",
  "generate-video",
  "review-video",
  "generate-listing",
  "export-zip",
  "publish-etsy",
  "publish-printify",
]);

const canvasOperationSchema = z.object({
  op: z.enum(["add_node", "remove_node", "connect", "disconnect", "update_config", "rename_node"]),
  ref: z.string().nullish(),
  type: workflowNodeTypeSchema.nullish(),
  label: z.string().nullish(),
  after: z.string().nullish(),
  nodeId: z.string().nullish(),
  source: z.string().nullish(),
  target: z.string().nullish(),
  config: z.record(z.string(), z.unknown()).nullish(),
});

const canvasPatchPayloadSchema = z.object({
  workflowId: z.string(),
  operations: z.array(canvasOperationSchema),
  warnings: z.array(z.string()),
});

const navigatePayloadSchema = z.object({ path: z.string(), label: z.string() });

const pendingActionStatusSchema = z.enum(["pending", "executing", "executed", "rejected", "expired", "failed"]);

const clientActionSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string(), kind: z.literal("edit_workflow_canvas"), payload: canvasPatchPayloadSchema }),
  z.object({ id: z.string(), kind: z.literal("navigate"), payload: navigatePayloadSchema }),
]);

export const assistantStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("conversation"), data: z.object({ conversationId: z.string(), userMessageId: z.string() }) }),
  z.object({ type: z.literal("delta"), data: z.object({ text: z.string() }) }),
  z.object({ type: z.literal("tool_started"), data: z.object({ callId: z.string(), name: z.string() }) }),
  z.object({ type: z.literal("tool_finished"), data: z.object({ callId: z.string(), name: z.string(), ok: z.boolean() }) }),
  z.object({ type: z.literal("citations"), data: z.object({ items: z.array(citationSchema) }) }),
  z.object({ type: z.literal("client_action"), data: clientActionSchema }),
  z.object({
    type: z.literal("pending_action"),
    data: z.object({
      id: z.string(),
      toolName: z.string(),
      title: z.string(),
      summary: z.string(),
      status: pendingActionStatusSchema,
      expiresAt: z.string(),
    }),
  }),
  z.object({ type: z.literal("choices"), data: choicesSchema }),
  z.object({
    type: z.literal("done"),
    data: z.object({
      assistantMessageId: z.string(),
      model: z.string().nullish(),
      inputTokens: z.number().nullish(),
      outputTokens: z.number().nullish(),
    }),
  }),
  z.object({ type: z.literal("error"), data: z.object({ code: z.string(), message: z.string() }) }),
]);

export const assistantComposerSchema = z.object({
  message: z.string().trim().min(1, "Type a message").max(ASSISTANT_MAX_MESSAGE_LENGTH, `Keep it under ${ASSISTANT_MAX_MESSAGE_LENGTH} characters`),
});

export type AssistantComposerValues = z.infer<typeof assistantComposerSchema>;

export const assistantMessageMetadataSchema = z.object({
  citations: z.array(citationSchema).optional(),
  toolCalls: z.array(z.object({ name: z.string(), ok: z.boolean() })).optional(),
  clientActions: z.array(clientActionSchema).optional(),
  pendingActionIds: z.array(z.string()).optional(),
  choices: choicesSchema.optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  kind: z.enum(["chat", "action_result"]).optional(),
  route: z.string().optional(),
});
