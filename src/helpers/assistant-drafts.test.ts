import { beforeEach, describe, expect, it } from "vitest";

import {
  ASSISTANT_DRAFTS_STORAGE_KEY_PREFIX,
  ASSISTANT_MAX_MESSAGE_LENGTH,
  ASSISTANT_NEW_CHAT_DRAFT_KEY,
} from "@/constants/assistant";
import {
  loadAssistantDrafts,
  moveDraft,
  saveAssistantDrafts,
  selectAssistantDraftKey,
  withDraft,
} from "@/helpers/assistant-drafts";

describe("assistant drafts", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keys drafts by the open conversation, or the new chat key when there is none", () => {
    expect(selectAssistantDraftKey({ conversationId: null, selectedConversationId: null })).toBe(ASSISTANT_NEW_CHAT_DRAFT_KEY);
    expect(selectAssistantDraftKey({ conversationId: null, selectedConversationId: "c-2" })).toBe("c-2");
    expect(selectAssistantDraftKey({ conversationId: "c-1", selectedConversationId: "c-2" })).toBe("c-1");
  });

  it("removes a draft once it is blank", () => {
    expect(withDraft({ "c-1": "hello" }, "c-1", "  ")).toEqual({});
  });

  it("moves a draft to another key", () => {
    expect(moveDraft({ [ASSISTANT_NEW_CHAT_DRAFT_KEY]: "hi" }, ASSISTANT_NEW_CHAT_DRAFT_KEY, "c-1")).toEqual({ "c-1": "hi" });
    expect(moveDraft({}, ASSISTANT_NEW_CHAT_DRAFT_KEY, "c-1")).toEqual({});
  });

  it("round-trips drafts per user", () => {
    saveAssistantDrafts("user-1", { "c-1": "hello" });

    expect(loadAssistantDrafts("user-1")).toEqual({ "c-1": "hello" });
    expect(loadAssistantDrafts("user-2")).toEqual({});
  });

  it("drops the stored entry when there is nothing left to keep", () => {
    saveAssistantDrafts("user-1", { "c-1": "hello" });

    saveAssistantDrafts("user-1", {});

    expect(window.localStorage.getItem(`${ASSISTANT_DRAFTS_STORAGE_KEY_PREFIX}user-1`)).toBeNull();
  });

  it("ignores broken or foreign values and caps the length of stored drafts", () => {
    const key = `${ASSISTANT_DRAFTS_STORAGE_KEY_PREFIX}user-1`;
    window.localStorage.setItem(key, "{not json");
    expect(loadAssistantDrafts("user-1")).toEqual({});

    window.localStorage.setItem(key, JSON.stringify({ a: 1, b: "keep", c: "x".repeat(ASSISTANT_MAX_MESSAGE_LENGTH + 1) }));

    const drafts = loadAssistantDrafts("user-1");
    expect(drafts).toEqual({ b: "keep", c: "x".repeat(ASSISTANT_MAX_MESSAGE_LENGTH) });
  });
});
