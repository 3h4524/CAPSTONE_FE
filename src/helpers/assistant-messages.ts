import type { AssistantChatState } from "@/helpers/assistant-reducer";
import { assistantMessageMetadataSchema } from "@/schemas/assistant";
import type { AssistantConversationDetail, AssistantMessageDto, AssistantUiMessage } from "@/types/assistant";

export const toAssistantUiMessage = (dto: AssistantMessageDto): AssistantUiMessage => {
  const parsed = assistantMessageMetadataSchema.safeParse(dto.metadata);
  const metadata = parsed.success ? parsed.data : {};
  const clientActions = metadata.clientActions ?? [];
  return {
    id: dto.id,
    key: dto.id,
    role: dto.role,
    content: dto.content,
    citations: metadata.citations ?? [],
    choices: metadata.choices ?? null,
    choicesUsed: true,
    clientActions,
    clientActionStates: Object.fromEntries(
      clientActions.map((action) => [action.id, metadata.clientActionStates?.[action.id] ?? ("idle" as const)])
    ),
    pendingActionIds: metadata.pendingActionIds ?? [],
    tools: (metadata.toolCalls ?? []).map((tool, index) => ({
      callId: `${dto.id}-${index}`,
      name: tool.name,
      status: tool.ok ? "ok" : "failed",
    })),
    error: metadata.error ?? null,
    retryInSeconds: null,
    isStreaming: false,
    createdAt: dto.createdAt,
  };
};

export const toAssistantChatState = (detail: AssistantConversationDetail): AssistantChatState => {
  const messages = detail.messages.map(toAssistantUiMessage);
  const lastIndex = messages.length - 1;
  const lastMessage = messages[lastIndex];
  return {
    conversationId: detail.id,
    messages: lastMessage?.role === "assistant" ? messages.map((message, index) => (index === lastIndex ? { ...message, choicesUsed: false } : message)) : messages,
    pendingActions: Object.fromEntries(detail.pendingActions.map((action) => [action.id, action])),
    streamingMessageId: null,
  };
};
