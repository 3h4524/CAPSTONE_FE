import type {
  AssistantPendingAction,
  AssistantStreamEvent,
  AssistantUiMessage,
} from "@/types/assistant";
import { uuid } from "@/utils/uuid";

export type AssistantChatState = {
  conversationId: string | null;
  messages: AssistantUiMessage[];
  pendingActions: Record<string, AssistantPendingAction>;
  streamingMessageId: string | null;
};

const createMessage = (role: AssistantUiMessage["role"], content: string, isStreaming: boolean): AssistantUiMessage => {
  const id = uuid();
  return {
    id,
    key: id,
    role,
    content,
    citations: [],
    choices: null,
    choicesUsed: false,
    clientActions: [],
    clientActionStates: {},
    pendingActionIds: [],
    tools: [],
    error: null,
    isStreaming,
    createdAt: new Date().toISOString(),
  };
};

export const createUserMessage = (content: string): AssistantUiMessage => createMessage("user", content, false);

export const createAssistantPlaceholder = (): AssistantUiMessage => createMessage("assistant", "", true);

const updateMessage = (
  state: AssistantChatState,
  messageId: string,
  update: (message: AssistantUiMessage) => AssistantUiMessage
): AssistantChatState => ({
  ...state,
  messages: state.messages.map((message) => (message.id === messageId ? update(message) : message)),
});

const renameLastUserMessage = (state: AssistantChatState, id: string): AssistantChatState => {
  const index = state.messages.findLastIndex((message) => message.role === "user");
  if (index < 0) return state;
  return { ...state, messages: state.messages.map((message, position) => (position === index ? { ...message, id } : message)) };
};

const finishStreaming = (state: AssistantChatState, streamingId: string, update: (message: AssistantUiMessage) => AssistantUiMessage) => ({
  ...updateMessage(state, streamingId, (message) => update({ ...message, isStreaming: false })),
  streamingMessageId: null,
});

export const reduceAssistantStreamEvent = (state: AssistantChatState, event: AssistantStreamEvent): AssistantChatState => {
  if (event.type === "conversation") {
    return renameLastUserMessage({ ...state, conversationId: event.data.conversationId }, event.data.userMessageId);
  }
  const streamingId = state.streamingMessageId;
  if (streamingId === null) return state;

  switch (event.type) {
    case "delta":
      return updateMessage(state, streamingId, (message) => ({ ...message, content: message.content + event.data.text }));
    case "tool_started":
      return updateMessage(state, streamingId, (message) => ({
        ...message,
        tools: [...message.tools, { callId: event.data.callId, name: event.data.name, status: "running" }],
      }));
    case "tool_finished":
      return updateMessage(state, streamingId, (message) => ({
        ...message,
        tools: message.tools.map((tool) =>
          tool.callId === event.data.callId ? { ...tool, status: event.data.ok ? "ok" : "failed" } : tool
        ),
      }));
    case "citations":
      return updateMessage(state, streamingId, (message) => {
        const known = new Set(message.citations.map((citation) => citation.documentId));
        const added = event.data.items.filter((citation) => {
          if (known.has(citation.documentId)) return false;
          known.add(citation.documentId);
          return true;
        });
        return { ...message, citations: [...message.citations, ...added] };
      });
    case "client_action":
      return updateMessage(state, streamingId, (message) => ({
        ...message,
        clientActions: [...message.clientActions, event.data],
        clientActionStates: { ...message.clientActionStates, [event.data.id]: "idle" },
      }));
    case "pending_action":
      return {
        ...updateMessage(state, streamingId, (message) => ({
          ...message,
          pendingActionIds: [...message.pendingActionIds, event.data.id],
        })),
        pendingActions: { ...state.pendingActions, [event.data.id]: event.data },
      };
    case "choices":
      return updateMessage(state, streamingId, (message) => ({ ...message, choices: event.data, choicesUsed: false }));
    case "done":
      return finishStreaming(state, streamingId, (message) => ({ ...message, id: event.data.assistantMessageId }));
    case "error":
      return finishStreaming(state, streamingId, (message) => ({ ...message, error: event.data }));
  }
};
