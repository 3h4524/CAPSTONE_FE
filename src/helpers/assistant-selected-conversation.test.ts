import { beforeEach, describe, expect, it } from "vitest";

import { ASSISTANT_SELECTED_CONVERSATION_STORAGE_KEY_PREFIX } from "@/constants/assistant";
import {
  loadSelectedConversationId,
  saveSelectedConversationId,
  selectCurrentConversationId,
} from "@/helpers/assistant-selected-conversation";

describe("assistant selected conversation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips the selected conversation per user", () => {
    saveSelectedConversationId("user-1", "c-1");
    saveSelectedConversationId("user-2", "c-2");

    expect(loadSelectedConversationId("user-1")).toBe("c-1");
    expect(loadSelectedConversationId("user-2")).toBe("c-2");
  });

  it("forgets the selection when it is cleared", () => {
    saveSelectedConversationId("user-1", "c-1");

    saveSelectedConversationId("user-1", null);

    expect(window.localStorage.getItem(`${ASSISTANT_SELECTED_CONVERSATION_STORAGE_KEY_PREFIX}user-1`)).toBeNull();
    expect(loadSelectedConversationId("user-1")).toBeNull();
  });

  it("ignores a blank stored value", () => {
    window.localStorage.setItem(`${ASSISTANT_SELECTED_CONVERSATION_STORAGE_KEY_PREFIX}user-1`, "  ");

    expect(loadSelectedConversationId("user-1")).toBeNull();
  });

  it.each([
    [{ conversationId: "c-1", selectedConversationId: "c-0" }, "c-1"],
    [{ conversationId: null, selectedConversationId: "c-0" }, "c-0"],
    [{ conversationId: null, selectedConversationId: null }, null],
  ])("picks the current conversation from %o", (state, expected) => {
    expect(selectCurrentConversationId(state)).toBe(expected);
  });
});
