import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { AssistantRoot } from "@/components/commons/assistant/assistant-root";
import { ASSISTANT_SELECTED_CONVERSATION_STORAGE_KEY_PREFIX } from "@/constants/assistant";
import { useAssistantStore } from "@/stores/assistant";
import { useAuthStore } from "@/stores/auth";
import { usePathname } from "@/test/__mocks__/next/navigation";
import { buildSessionUser } from "@/test/factories";
import { renderWithQuery } from "@/test/render-with-query";
import { act } from "@testing-library/react";

const getAssistantConversation = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  getAssistantConversation: (...args: unknown[]) => getAssistantConversation(...args),
}));

const storageKey = (userId: string) => `${ASSISTANT_SELECTED_CONVERSATION_STORAGE_KEY_PREFIX}${userId}`;

describe("AssistantRoot", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    useAuthStore.setState({ user: buildSessionUser({ id: "user-1" }) });
    usePathname.mockReturnValue("/dashboard");
    getAssistantConversation.mockReset();
    getAssistantConversation.mockReturnValue(new Promise(() => undefined));
  });

  it("reopens the conversation the user had selected before the reload", () => {
    window.localStorage.setItem(storageKey("user-1"), "c-7");

    renderWithQuery(<AssistantRoot />);

    expect(useAssistantStore.getState().selectedConversationId).toBe("c-7");
  });

  it("remembers the conversation the stream assigns and forgets it on a new chat", () => {
    renderWithQuery(<AssistantRoot />);

    act(() => useAssistantStore.setState({ conversationId: "c-9" }));
    expect(window.localStorage.getItem(storageKey("user-1"))).toBe("c-9");

    act(() => useAssistantStore.getState().startNewConversation());
    expect(window.localStorage.getItem(storageKey("user-1"))).toBeNull();
  });

  it("keeps the selection of each user apart", () => {
    window.localStorage.setItem(storageKey("user-2"), "c-other");

    renderWithQuery(<AssistantRoot />);

    expect(useAssistantStore.getState().selectedConversationId).toBeNull();
  });
});
