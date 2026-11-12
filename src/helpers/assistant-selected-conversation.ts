import { ASSISTANT_SELECTED_CONVERSATION_STORAGE_KEY_PREFIX } from "@/constants/assistant";

const storageKey = (userId: string) => `${ASSISTANT_SELECTED_CONVERSATION_STORAGE_KEY_PREFIX}${userId}`;

export const selectCurrentConversationId = (state: { conversationId: string | null; selectedConversationId: string | null }) =>
  state.conversationId ?? state.selectedConversationId;

export const loadSelectedConversationId = (userId: string): string | null => {
  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    return stored && stored.trim().length > 0 ? stored : null;
  } catch {
    return null;
  }
};

export const saveSelectedConversationId = (userId: string, conversationId: string | null) => {
  try {
    if (conversationId === null) window.localStorage.removeItem(storageKey(userId));
    else window.localStorage.setItem(storageKey(userId), conversationId);
  } catch {
    return;
  }
};
