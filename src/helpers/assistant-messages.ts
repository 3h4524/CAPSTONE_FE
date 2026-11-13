import { ASSISTANT_INTERRUPTED_ERROR } from "@/constants/assistant";
import type { AssistantChatState } from "@/helpers/assistant-reducer";
import { assistantMessageMetadataSchema } from "@/schemas/assistant";
import type { AssistantConversationDetail, AssistantError, AssistantMessageDto, AssistantUiMessage } from "@/types/assistant";

const toMessageError = (dto: AssistantMessageDto, metadataError: AssistantError | undefined): AssistantError | null => {
  if (dto.status === "interrupted") return ASSISTANT_INTERRUPTED_ERROR;
  if (dto.status === "stopped") return null;
  return metadataError ?? null;
};

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
    error: toMessageError(dto, metadata.error),
    retryInSeconds: null,
    isStreaming: false,
    isStopped: dto.status === "stopped",
    createdAt: dto.createdAt,
  };
};

export const toAssistantChatState = (detail: AssistantConversationDetail): AssistantChatState => {
  const messages = detail.messages.map(toAssistantUiMessage);
  const lastIndex = messages.length - 1;
  const lastMessage = messages[lastIndex];
  const isAssistantLast = lastMessage?.role === "assistant";
  const streamingId = isAssistantLast && detail.messages.at(-1)?.status === "streaming" ? lastMessage.id : null;
  return {
    conversationId: detail.id,
    messages: isAssistantLast
      ? messages.map((message, index) =>
          index === lastIndex ? { ...message, choicesUsed: false, isStreaming: streamingId !== null } : message
        )
      : messages,
    pendingActions: Object.fromEntries(detail.pendingActions.map((action) => [action.id, action])),
    streamingMessageId: streamingId,
    activeStream: streamingId === null ? null : { assistantMessageId: streamingId, lastEventId: null, isAttached: false },
  };
};
