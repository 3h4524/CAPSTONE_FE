import axios from "axios";

import { api } from "@/api/client";
import { createAssistantStreamParser, readStreamErrorBody } from "@/helpers/assistant-stream";
import type {
  AssistantActionResult,
  AssistantConversationDetail,
  AssistantConversationSummary,
  AssistantStreamEvent,
  SendAssistantMessageInput,
} from "@/types/assistant";

export const assistantKeys = {
  all: ["assistant"] as const,
  conversations: () => [...assistantKeys.all, "conversations"] as const,
  conversation: (id: string | null) => [...assistantKeys.conversations(), id] as const,
};

export const listAssistantConversations = async (signal?: AbortSignal) =>
  (await api.get<AssistantConversationSummary[]>("/api/assistant/conversations", { signal })).data;

export const getAssistantConversation = async (id: string, signal?: AbortSignal) =>
  (await api.get<AssistantConversationDetail>(`/api/assistant/conversations/${id}`, { signal })).data;

export const confirmAssistantAction = async (id: string) =>
  (await api.post<AssistantActionResult>(`/api/assistant/actions/${id}/confirm`)).data;

export const rejectAssistantAction = async (id: string) =>
  (await api.post<AssistantActionResult>(`/api/assistant/actions/${id}/reject`)).data;

export const streamAssistantChat = async (
  input: SendAssistantMessageInput,
  onEvent: (event: AssistantStreamEvent) => void,
  signal: AbortSignal
): Promise<void> => {
  const response = await api
    .post<ReadableStream<Uint8Array>>("/api/assistant/chat", input, {
      adapter: "fetch",
      responseType: "stream",
      signal,
      headers: { Accept: "text/event-stream" },
    })
    .catch(async (error: unknown) => {
      if (axios.isAxiosError(error)) await readStreamErrorBody(error);
      throw error;
    });
  const reader = response.data.getReader();
  const decoder = new TextDecoder();
  const parser = createAssistantStreamParser();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true })).forEach(onEvent);
  }
  parser.push(decoder.decode()).forEach(onEvent);
  parser.flush().forEach(onEvent);
};
