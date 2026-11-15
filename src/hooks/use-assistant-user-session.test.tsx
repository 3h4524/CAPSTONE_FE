import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import {
  ASSISTANT_DRAFTS_STORAGE_KEY_PREFIX,
  ASSISTANT_SELECTED_CONVERSATION_STORAGE_KEY_PREFIX,
} from "@/constants/assistant";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useAssistantUserSession } from "@/hooks/use-assistant-user-session";
import { useAssistantStore } from "@/stores/assistant";
import { renderQueryHook } from "@/test/render-query-hook";
import { act } from "@testing-library/react";

const streamAssistantChat = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  streamAssistantChat: (...args: unknown[]) => streamAssistantChat(...args),
}));

const selectedKey = (userId: string) => `${ASSISTANT_SELECTED_CONVERSATION_STORAGE_KEY_PREFIX}${userId}`;
const draftsKey = (userId: string) => `${ASSISTANT_DRAFTS_STORAGE_KEY_PREFIX}${userId}`;

const renderSession = (userId: string | null) => {
  let capturedSignal: AbortSignal | null = null;
  streamAssistantChat.mockImplementation(
    (_input: unknown, _onEvent: unknown, signal: AbortSignal) =>
      new Promise((_resolve, reject) => {
        capturedSignal = signal;
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      })
  );
  const rendered = renderQueryHook(
    ({ id }: { id: string | null }) => {
      useAssistantUserSession(id);
      return useAssistantChat();
    },
    { initialProps: { id: userId } }
  );
  return { ...rendered, signal: () => capturedSignal as AbortSignal | null };
};

describe("useAssistantUserSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    streamAssistantChat.mockReset();
  });

  it("restores the user's selected conversation and drafts", () => {
    window.localStorage.setItem(selectedKey("user-1"), "c-1");
    window.localStorage.setItem(draftsKey("user-1"), JSON.stringify({ "c-1": "half typed" }));

    renderSession("user-1");

    const state = useAssistantStore.getState();
    expect(state.selectedConversationId).toBe("c-1");
    expect(state.drafts).toEqual({ "c-1": "half typed" });
  });

  it("resets the chat and detaches its stream when another user signs in, then restores that user's state", async () => {
    window.localStorage.setItem(selectedKey("user-2"), "c-2");
    window.localStorage.setItem(draftsKey("user-2"), JSON.stringify({ "c-2": "theirs" }));
    const { result, rerender, signal } = renderSession("user-1");
    await act(async () => {
      result.current.send("secret question");
      await Promise.resolve();
    });
    act(() => useAssistantStore.getState().setDraft("new-chat", "mine"));

    rerender({ id: "user-2" });

    const state = useAssistantStore.getState();
    expect(signal()?.aborted).toBe(true);
    expect(state.messages).toEqual([]);
    expect(state.streamingMessageId).toBeNull();
    expect(state.selectedConversationId).toBe("c-2");
    expect(state.drafts).toEqual({ "c-2": "theirs" });
    expect(window.localStorage.getItem(draftsKey("user-1"))).toBe(JSON.stringify({ "new-chat": "mine" }));
  });

  it("clears the chat on logout without touching the signed-out user's saved state", () => {
    window.localStorage.setItem(selectedKey("user-1"), "c-1");
    const { rerender } = renderSession("user-1");
    act(() => useAssistantStore.setState({ isOpen: true, messages: [] }));

    rerender({ id: null });

    const state = useAssistantStore.getState();
    expect(state.selectedConversationId).toBeNull();
    expect(state.isOpen).toBe(false);
    expect(state.sessionUserId).toBeNull();
    expect(window.localStorage.getItem(selectedKey("user-1"))).toBe("c-1");
  });

  it("keeps the chat and its stream when the same user's assistant remounts", async () => {
    const first = renderSession("user-1");
    await act(async () => {
      first.result.current.send("question");
      await Promise.resolve();
    });
    const signal = first.signal();
    first.unmount();

    renderQueryHook(() => useAssistantUserSession("user-1"));

    expect(signal?.aborted).toBe(false);
    expect(useAssistantStore.getState().messages).toHaveLength(2);
    expect(useAssistantStore.getState().streamingMessageId).not.toBeNull();
  });
});
