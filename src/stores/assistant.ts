import { create } from "zustand";

import { ASSISTANT_NEW_CHAT_DRAFT_KEY, ASSISTANT_PANEL_DEFAULT_WIDTH_PX } from "@/constants/assistant";
import type { AssistantDisplayMode } from "@/helpers/assistant-display-mode";
import { type AssistantDrafts, moveDraft, withDraft } from "@/helpers/assistant-drafts";
import type { LauncherPosition } from "@/helpers/assistant-launcher-position";
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
  launcherPosition: LauncherPosition | null;
  panelWidth: number;
  displayMode: AssistantDisplayMode;
  isBubbleExpanded: boolean;
  drafts: AssistantDrafts;
  setPanelWidth: (width: number) => void;
  setDisplayMode: (mode: AssistantDisplayMode) => void;
  toggleBubbleExpanded: () => void;
  setLauncherPosition: (position: LauncherPosition | null) => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  loadConversation: (state: AssistantChatState) => void;
  beginExchange: (userMessage: AssistantUiMessage, placeholder: AssistantUiMessage) => void;
  retryExchange: (failedMessageKey: string, placeholder: AssistantUiMessage) => void;
  applyStreamEvent: (exchangeId: string, event: AssistantStreamEvent) => void;
  stopStreaming: (exchangeId: string) => void;
  failStreaming: (exchangeId: string, error: AssistantError) => void;
  upsertPendingAction: (action: AssistantPendingAction) => void;
  appendMessage: (message: AssistantUiMessage) => void;
  markChoicesUsed: (messageId: string) => void;
  setClientActionState: (messageId: string, actionId: string, state: AssistantClientActionState) => void;
  setDraft: (key: string, text: string) => void;
  hydrateDrafts: (drafts: AssistantDrafts) => void;
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
  exchangeId: string,
  update: (message: AssistantUiMessage) => AssistantUiMessage
): Partial<AssistantChatState> => {
  if (state.streamingMessageId !== exchangeId) return {};
  return {
    messages: mapMessage(state.messages, exchangeId, (message) => update({ ...message, isStreaming: false })),
    streamingMessageId: null,
  };
};

const applyActiveStreamEvent = (state: AssistantState, exchangeId: string, event: AssistantStreamEvent) => {
  if (state.streamingMessageId !== exchangeId) return state;
  const chat = reduceAssistantStreamEvent(state, event);
  const gainedConversationId = state.conversationId === null ? chat.conversationId : null;
  return gainedConversationId === null
    ? chat
    : { ...chat, drafts: moveDraft(state.drafts, ASSISTANT_NEW_CHAT_DRAFT_KEY, gainedConversationId) };
};

export const useAssistantStore = create<AssistantState>((set) => ({
  ...EMPTY_CHAT,
  isOpen: false,
  selectedConversationId: null,
  launcherPosition: null,
  panelWidth: ASSISTANT_PANEL_DEFAULT_WIDTH_PX,
  displayMode: "bubble",
  isBubbleExpanded: false,
  drafts: {},

  setPanelWidth: (width) => set({ panelWidth: width }),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  toggleBubbleExpanded: () => set((state) => ({ isBubbleExpanded: !state.isBubbleExpanded })),

  setLauncherPosition: (position) => set({ launcherPosition: position }),

  setOpen: (open) => set({ isOpen: open }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  startNewConversation: () => set({ ...EMPTY_CHAT, selectedConversationId: null }),

  selectConversation: (id) => set({ ...EMPTY_CHAT, selectedConversationId: id }),

  loadConversation: (chat) =>
    set((state) => (state.streamingMessageId === null ? { ...chat, selectedConversationId: chat.conversationId } : state)),

  beginExchange: (userMessage, placeholder) =>
    set((state) => ({
      messages: [...state.messages, userMessage, placeholder],
      streamingMessageId: placeholder.id,
    })),

  retryExchange: (failedMessageKey, placeholder) =>
    set((state) => ({
      messages: state.messages.map((message) => (message.key === failedMessageKey ? placeholder : message)),
      streamingMessageId: placeholder.id,
    })),

  applyStreamEvent: (exchangeId, event) => set((state) => applyActiveStreamEvent(state, exchangeId, event)),

  stopStreaming: (exchangeId) => set((state) => finishStreamingMessage(state, exchangeId, (message) => message)),

  failStreaming: (exchangeId, error) =>
    set((state) => finishStreamingMessage(state, exchangeId, (message) => ({ ...message, error }))),

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

  setDraft: (key, text) => set((state) => ({ drafts: withDraft(state.drafts, key, text) })),

  hydrateDrafts: (drafts) => set({ drafts }),
}));
