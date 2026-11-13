import { create } from "zustand";

import {
  ASSISTANT_INTERRUPTED_ERROR,
  ASSISTANT_NEW_CHAT_DRAFT_KEY,
  ASSISTANT_PANEL_DEFAULT_WIDTH_PX,
} from "@/constants/assistant";
import type { AssistantDisplayMode } from "@/helpers/assistant-display-mode";
import { type AssistantDrafts, moveDraft, withDraft } from "@/helpers/assistant-drafts";
import type { LauncherPosition } from "@/helpers/assistant-launcher-position";
import { type AssistantChatState, clearAssistantReply, reduceAssistantStreamEvent } from "@/helpers/assistant-reducer";
import type {
  AssistantActiveStream,
  AssistantClientActionDecision,
  AssistantClientActionState,
  AssistantError,
  AssistantParkedStream,
  AssistantPendingAction,
  AssistantStreamEntry,
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
  sessionUserId: string | null;
  parkedStreams: Record<string, AssistantParkedStream>;
  goneStreamIds: string[];
  queuedClientActionStates: Record<string, Record<string, AssistantClientActionDecision>>;
  setPanelWidth: (width: number) => void;
  setDisplayMode: (mode: AssistantDisplayMode) => void;
  toggleBubbleExpanded: () => void;
  setLauncherPosition: (position: LauncherPosition | null) => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  restoreSelectedConversation: (id: string | null) => void;
  switchSessionUser: (userId: string | null) => void;
  loadConversation: (state: AssistantChatState) => void;
  beginExchange: (userMessage: AssistantUiMessage, placeholder: AssistantUiMessage) => void;
  retryExchange: (failedMessageKey: string, placeholder: AssistantUiMessage) => void;
  markStreamAttached: (exchangeId: string) => void;
  clearStreamingReply: (exchangeId: string) => void;
  applyStreamEvent: (exchangeId: string, event: AssistantStreamEntry) => void;
  stopStreaming: (exchangeId: string) => void;
  failStreaming: (exchangeId: string, error: AssistantError) => void;
  abandonStream: (exchangeId: string, error: AssistantError | null) => void;
  queueClientActionState: (messageId: string, actionId: string, state: AssistantClientActionDecision) => void;
  dropQueuedClientActionStates: (messageId: string) => void;
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
  activeStream: null,
};

const LIVE_STREAM: AssistantActiveStream = { assistantMessageId: null, lastEventId: null, isAttached: true };

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
    activeStream: null,
  };
};

const applyActiveStreamEvent = (state: AssistantState, exchangeId: string, event: AssistantStreamEntry) => {
  if (state.streamingMessageId !== exchangeId) return state;
  const reduced = reduceAssistantStreamEvent(state, event);
  const chat =
    event.id && reduced.activeStream ? { ...reduced, activeStream: { ...reduced.activeStream, lastEventId: event.id } } : reduced;
  const gainedConversationId = state.conversationId === null ? chat.conversationId : null;
  return gainedConversationId === null
    ? chat
    : { ...chat, drafts: moveDraft(state.drafts, ASSISTANT_NEW_CHAT_DRAFT_KEY, gainedConversationId) };
};

const parkActiveStream = (state: AssistantState): Record<string, AssistantParkedStream> => {
  const assistantMessageId = state.activeStream?.assistantMessageId;
  const lastEventId = state.activeStream?.lastEventId;
  const message = state.messages.find((candidate) => candidate.id === state.streamingMessageId);
  if (!assistantMessageId || !lastEventId || !message) return state.parkedStreams;
  return { ...state.parkedStreams, [assistantMessageId]: { lastEventId, message } };
};

const withoutKey = <T>(record: Record<string, T>, key: string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key));

const resumeLoadedStream = (state: AssistantState, chat: AssistantChatState): Partial<AssistantState> => {
  const streamingId = chat.streamingMessageId;
  if (streamingId === null) return chat;
  if (state.goneStreamIds.includes(streamingId)) {
    return {
      ...chat,
      messages: mapMessage(chat.messages, streamingId, (message) => ({
        ...message,
        isStreaming: false,
        error: ASSISTANT_INTERRUPTED_ERROR,
      })),
      streamingMessageId: null,
      activeStream: null,
    };
  }
  const parked = state.parkedStreams[streamingId];
  if (!parked) return { ...chat, activeStream: { assistantMessageId: streamingId, lastEventId: null, isAttached: false } };
  return {
    ...chat,
    messages: mapMessage(chat.messages, streamingId, () => ({ ...parked.message, id: streamingId, key: streamingId, isStreaming: true })),
    activeStream: { assistantMessageId: streamingId, lastEventId: parked.lastEventId, isAttached: false },
    parkedStreams: withoutKey(state.parkedStreams, streamingId),
  };
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
  sessionUserId: null,
  parkedStreams: {},
  goneStreamIds: [],
  queuedClientActionStates: {},

  setPanelWidth: (width) => set({ panelWidth: width }),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  toggleBubbleExpanded: () => set((state) => ({ isBubbleExpanded: !state.isBubbleExpanded })),

  setLauncherPosition: (position) => set({ launcherPosition: position }),

  setOpen: (open) => set({ isOpen: open }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  startNewConversation: () =>
    set((state) => ({ ...EMPTY_CHAT, selectedConversationId: null, parkedStreams: parkActiveStream(state) })),

  selectConversation: (id) =>
    set((state) => ({ ...EMPTY_CHAT, selectedConversationId: id, parkedStreams: parkActiveStream(state) })),

  restoreSelectedConversation: (id) =>
    set((state) =>
      state.conversationId === null && state.selectedConversationId === null && state.messages.length === 0
        ? { selectedConversationId: id }
        : state
    ),

  switchSessionUser: (userId) =>
    set({
      ...EMPTY_CHAT,
      isOpen: false,
      selectedConversationId: null,
      drafts: {},
      sessionUserId: userId,
      parkedStreams: {},
      goneStreamIds: [],
      queuedClientActionStates: {},
    }),

  loadConversation: (chat) =>
    set((state) =>
      state.streamingMessageId === null ? { ...resumeLoadedStream(state, chat), selectedConversationId: chat.conversationId } : state
    ),

  beginExchange: (userMessage, placeholder) =>
    set((state) => ({
      messages: [...state.messages, userMessage, placeholder],
      streamingMessageId: placeholder.id,
      activeStream: LIVE_STREAM,
    })),

  retryExchange: (failedMessageKey, placeholder) =>
    set((state) => ({
      messages: state.messages.map((message) => (message.key === failedMessageKey ? placeholder : message)),
      streamingMessageId: placeholder.id,
      activeStream: LIVE_STREAM,
    })),

  markStreamAttached: (exchangeId) =>
    set((state) =>
      state.streamingMessageId === exchangeId && state.activeStream
        ? { activeStream: { ...state.activeStream, isAttached: true } }
        : state
    ),

  clearStreamingReply: (exchangeId) =>
    set((state) =>
      state.streamingMessageId === exchangeId ? { messages: mapMessage(state.messages, exchangeId, clearAssistantReply) } : state
    ),

  applyStreamEvent: (exchangeId, event) => set((state) => applyActiveStreamEvent(state, exchangeId, event)),

  stopStreaming: (exchangeId) =>
    set((state) => finishStreamingMessage(state, exchangeId, (message) => ({ ...message, isStopped: true }))),

  failStreaming: (exchangeId, error) =>
    set((state) => finishStreamingMessage(state, exchangeId, (message) => ({ ...message, error }))),

  abandonStream: (exchangeId, error) =>
    set((state) =>
      state.streamingMessageId === exchangeId
        ? {
            ...finishStreamingMessage(state, exchangeId, (message) => ({ ...message, error })),
            goneStreamIds: [...state.goneStreamIds, state.activeStream?.assistantMessageId ?? exchangeId],
            selectedConversationId: state.conversationId ?? state.selectedConversationId,
          }
        : state
    ),

  queueClientActionState: (messageId, actionId, actionState) =>
    set((state) => ({
      queuedClientActionStates: {
        ...state.queuedClientActionStates,
        [messageId]: { ...state.queuedClientActionStates[messageId], [actionId]: actionState },
      },
    })),

  dropQueuedClientActionStates: (messageId) =>
    set((state) => ({ queuedClientActionStates: withoutKey(state.queuedClientActionStates, messageId) })),

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
