import { create } from "zustand";

import { type AssistantChatState, reduceAssistantStreamEvent } from "@/helpers/assistant-reducer";
import type {
  AssistantClientActionState,
  AssistantError,
  AssistantPendingAction,
  AssistantStreamEvent,
  AssistantUiMessage,
} from "@/types/assistant";

type AssistantState = AssistantChatState & {
  isOpen: boolean;
  selectedConversationId: string | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  loadConversation: (state: AssistantChatState) => void;
  beginExchange: (userMessage: AssistantUiMessage, placeholder: AssistantUiMessage) => void;
  applyStreamEvent: (event: AssistantStreamEvent) => void;
  stopStreaming: () => void;
  failStreaming: (error: AssistantError) => void;
  upsertPendingAction: (action: AssistantPendingAction) => void;
  appendMessage: (message: AssistantUiMessage) => void;
  markChoicesUsed: (messageId: string) => void;
  setClientActionState: (messageId: string, actionId: string, state: AssistantClientActionState) => void;
};

const EMPTY_CHAT: AssistantChatState = {
  conversationId: null,
  messages: [],
  pendingActions: {},
  streamingMessageId: null,
};

const mapMessage = (
  messages: AssistantUiMessage[],
  messageId: string,
  update: (message: AssistantUiMessage) => AssistantUiMessage
) => messages.map((message) => (message.id === messageId ? update(message) : message));

const finishStreamingMessage = (
  state: AssistantChatState,
  update: (message: AssistantUiMessage) => AssistantUiMessage
): Partial<AssistantChatState> => {
  const streamingId = state.streamingMessageId;
  if (streamingId === null) return {};
  return {
    messages: mapMessage(state.messages, streamingId, (message) => update({ ...message, isStreaming: false })),
    streamingMessageId: null,
  };
};

export const useAssistantStore = create<AssistantState>((set) => ({
  ...EMPTY_CHAT,
  isOpen: false,
  selectedConversationId: null,

  setOpen: (open) => set({ isOpen: open }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  startNewConversation: () => set({ ...EMPTY_CHAT, selectedConversationId: null }),

  selectConversation: (id) =>
    set((state) => (state.streamingMessageId === null ? { ...EMPTY_CHAT, selectedConversationId: id } : state)),

  loadConversation: (chat) =>
    set((state) => (state.streamingMessageId === null ? { ...chat, selectedConversationId: chat.conversationId } : state)),

  beginExchange: (userMessage, placeholder) =>
    set((state) => ({
      messages: [...state.messages, userMessage, placeholder],
      streamingMessageId: placeholder.id,
    })),

  applyStreamEvent: (event) => set((state) => reduceAssistantStreamEvent(state, event)),

  stopStreaming: () => set((state) => finishStreamingMessage(state, (message) => message)),

  failStreaming: (error) => set((state) => finishStreamingMessage(state, (message) => ({ ...message, error }))),

  upsertPendingAction: (action) =>
    set((state) => ({ pendingActions: { ...state.pendingActions, [action.id]: action } })),

  appendMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  markChoicesUsed: (messageId) =>
    set((state) => ({
      messages: mapMessage(state.messages, messageId, (message) => ({ ...message, choicesUsed: true })),
    })),

  setClientActionState: (messageId, actionId, actionState) =>
    set((state) => ({
      messages: mapMessage(state.messages, messageId, (message) => ({
        ...message,
        clientActionStates: { ...message.clientActionStates, [actionId]: actionState },
      })),
    })),
}));
