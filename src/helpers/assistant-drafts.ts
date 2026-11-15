import {
  ASSISTANT_DRAFTS_STORAGE_KEY_PREFIX,
  ASSISTANT_MAX_MESSAGE_LENGTH,
  ASSISTANT_NEW_CHAT_DRAFT_KEY,
} from "@/constants/assistant";

export type AssistantDrafts = Record<string, string>;

export const assistantDraftKey = (conversationId: string | null) => conversationId ?? ASSISTANT_NEW_CHAT_DRAFT_KEY;

export const selectAssistantDraftKey = (state: { conversationId: string | null; selectedConversationId: string | null }) =>
  assistantDraftKey(state.conversationId ?? state.selectedConversationId);

const withoutDraft = (drafts: AssistantDrafts, key: string): AssistantDrafts =>
  Object.fromEntries(Object.entries(drafts).filter(([draftKey]) => draftKey !== key));

export const withDraft = (drafts: AssistantDrafts, key: string, text: string): AssistantDrafts => {
  const draft = text.slice(0, ASSISTANT_MAX_MESSAGE_LENGTH);
  return draft.trim().length > 0 ? { ...drafts, [key]: draft } : withoutDraft(drafts, key);
};

export const moveDraft = (drafts: AssistantDrafts, from: string, to: string): AssistantDrafts => {
  const draft = drafts[from];
  return draft === undefined ? drafts : withDraft(withoutDraft(drafts, from), to, draft);
};

const storageKey = (userId: string) => `${ASSISTANT_DRAFTS_STORAGE_KEY_PREFIX}${userId}`;

export const loadAssistantDrafts = (userId: string): AssistantDrafts => {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.entries(parsed).reduce<AssistantDrafts>(
      (drafts, [key, text]) => (typeof text === "string" ? withDraft(drafts, key, text) : drafts),
      {}
    );
  } catch {
    return {};
  }
};

export const saveAssistantDrafts = (userId: string, drafts: AssistantDrafts) => {
  try {
    if (Object.keys(drafts).length === 0) window.localStorage.removeItem(storageKey(userId));
    else window.localStorage.setItem(storageKey(userId), JSON.stringify(drafts));
  } catch {
    return;
  }
};
