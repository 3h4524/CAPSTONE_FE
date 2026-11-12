import axios from "axios";

import { api } from "@/api/client";
import { readAssistantStream, readStreamErrorBody } from "@/helpers/assistant-stream";
import type {
  AssistantActionResult,
  AssistantClientActionDecision,
  AssistantConversationDetail,
  AssistantConversationSummary,
  AssistantRunProgress,
  AssistantStreamEntry,
  SendAssistantMessageInput,
} from "@/types/assistant";

export const assistantKeys = {
  all: ["assistant"] as const,
  conversations: () => [...assistantKeys.all, "conversations"] as const,
  conversation: (id: string | null) => [...assistantKeys.conversations(), id] as const,
  runProgress: (workflowId: string | null) => [...assistantKeys.all, "run-progress", workflowId] as const,
};

export const listAssistantConversations = async (signal?: AbortSignal) =>
  (await api.get<AssistantConversationSummary[]>("/api/assistant/conversations", { signal })).data;

export const getAssistantConversation = async (id: string, signal?: AbortSignal) =>
  (await api.get<AssistantConversationDetail>(`/api/assistant/conversations/${id}`, { signal })).data;

export const getAssistantRunProgress = async (workflowId: string, signal?: AbortSignal) =>
  (await api.get<AssistantRunProgress>(`/api/assistant/workflows/${workflowId}/run-progress`, { signal })).data;

export type AssistantClientActionStateInput = { messageId: string; actionId: string; state: AssistantClientActionDecision };

export const setAssistantClientActionState = async ({ messageId, actionId, state }: AssistantClientActionStateInput) => {
  await api.put(`/api/assistant/messages/${messageId}/client-actions/${actionId}`, { state });
};

export const deleteAssistantConversation = async (id: string) => {
  await api.delete(`/api/assistant/conversations/${id}`);
};

export const deleteAssistantConversations = async (exceptConversationId: string | null) => {
  await api.delete("/api/assistant/conversations", { params: exceptConversationId ? { except: exceptConversationId } : undefined });
};

export const confirmAssistantAction = async (id: string) =>
  (await api.post<AssistantActionResult>(`/api/assistant/actions/${id}/confirm`)).data;

export const rejectAssistantAction = async (id: string) =>
  (await api.post<AssistantActionResult>(`/api/assistant/actions/${id}/reject`)).data;

const rethrowStreamError = async (error: unknown): Promise<never> => {
  if (axios.isAxiosError(error)) await readStreamErrorBody(error);
  throw error;
};

export const streamAssistantChat = async (
  input: SendAssistantMessageInput,
  onEvent: (event: AssistantStreamEntry) => void,
  signal: AbortSignal
): Promise<void> => {
  const response = await api
    .post<ReadableStream<Uint8Array>>("/api/assistant/chat", input, {
      adapter: "fetch",
      responseType: "stream",
      signal,
      headers: { Accept: "text/event-stream" },
    })
    .catch(rethrowStreamError);
  await readAssistantStream(response.data, onEvent);
};

export const streamAssistantMessage = async (
  messageId: string,
  lastEventId: string | null,
  onEvent: (event: AssistantStreamEntry) => void,
  signal: AbortSignal
): Promise<void> => {
  const response = await api
    .get<ReadableStream<Uint8Array>>(`/api/assistant/messages/${messageId}/stream`, {
      adapter: "fetch",
      responseType: "stream",
      signal,
      headers: lastEventId ? { Accept: "text/event-stream", "Last-Event-ID": lastEventId } : { Accept: "text/event-stream" },
    })
    .catch(rethrowStreamError);
  await readAssistantStream(response.data, onEvent);
};

export const stopAssistantMessage = async (messageId: string) => {
  await api.post(`/api/assistant/messages/${messageId}/stop`);
};
