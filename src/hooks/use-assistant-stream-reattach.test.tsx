import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { ASSISTANT_INTERRUPTED_ERROR } from "@/constants/assistant";
import { useAssistantConversation } from "@/hooks/queries/use-assistant-conversation";
import { useAssistantStreamReattach } from "@/hooks/use-assistant-stream-reattach";
import { useAssistantStore } from "@/stores/assistant";
import { renderQueryHook } from "@/test/render-query-hook";
import type { AssistantConversationDetail, AssistantMessageStatus, AssistantStreamEntry } from "@/types/assistant";
import { act, waitFor } from "@testing-library/react";

const getAssistantConversation = vi.fn();
const streamAssistantMessage = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  getAssistantConversation: (...args: unknown[]) => getAssistantConversation(...args),
  streamAssistantMessage: (...args: unknown[]) => streamAssistantMessage(...args),
}));

vi.mock("@/helpers/toast", () => ({ showToast: vi.fn() }));

const detail = (status: AssistantMessageStatus, content = "Partial"): AssistantConversationDetail => ({
  id: "c-1",
  title: "Chat",
  pendingActions: [],
  messages: [
    { id: "u-1", role: "user", content: "Question", metadata: {}, status: "done", createdAt: "" },
    { id: "a-1", role: "assistant", content, metadata: {}, status, createdAt: "" },
  ],
});

const renderPodi = () =>
  renderQueryHook(() => {
    useAssistantStreamReattach();
    return useAssistantConversation(useAssistantStore((state) => state.selectedConversationId));
  });

describe("useAssistantStreamReattach", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    getAssistantConversation.mockReset();
    streamAssistantMessage.mockReset();
    useAssistantStore.getState().restoreSelectedConversation("c-1");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-attaches to a reply that is still streaming when the conversation loads", async () => {
    let emit: (event: AssistantStreamEntry) => void = () => undefined;
    getAssistantConversation.mockResolvedValue(detail("streaming"));
    streamAssistantMessage.mockImplementation((_id: string, _lastEventId: string | null, onEvent: typeof emit) => {
      emit = onEvent;
      return new Promise(() => undefined);
    });

    renderPodi();

    await waitFor(() => expect(streamAssistantMessage).toHaveBeenCalledTimes(1));
    expect(streamAssistantMessage).toHaveBeenCalledWith("a-1", null, expect.any(Function), expect.any(AbortSignal));
    expect(useAssistantStore.getState().streamingMessageId).toBe("a-1");

    act(() => {
      emit({ id: "1-0", type: "delta", data: { text: "Partial and the rest" } });
      emit({ id: "2-0", type: "done", data: { assistantMessageId: "a-1" } });
    });

    expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({ content: "Partial and the rest", isStreaming: false });
  });

  it("does not attach when the loaded reply is done", async () => {
    getAssistantConversation.mockResolvedValue(detail("done", "Full answer"));

    renderPodi();

    await waitFor(() => expect(useAssistantStore.getState().messages.at(-1)?.content).toBe("Full answer"));
    expect(streamAssistantMessage).not.toHaveBeenCalled();
  });

  it("refetches the conversation when the stream is gone and shows the final reply", async () => {
    getAssistantConversation.mockResolvedValueOnce(detail("streaming")).mockResolvedValueOnce(detail("done", "Final"));
    streamAssistantMessage.mockRejectedValue({ response: { status: 404, data: { code: "assistant.stream_not_found" } } });

    renderPodi();

    await waitFor(() => expect(useAssistantStore.getState().messages.at(-1)?.content).toBe("Final"));
    expect(getAssistantConversation).toHaveBeenCalledTimes(2);
    expect(streamAssistantMessage).toHaveBeenCalledTimes(1);
  });

  it("shows the reply as interrupted instead of looping when it still loads as streaming after a 404", async () => {
    getAssistantConversation.mockResolvedValue(detail("streaming"));
    streamAssistantMessage.mockRejectedValue({ response: { status: 404, data: { code: "assistant.stream_not_found" } } });

    renderPodi();

    await waitFor(() => expect(getAssistantConversation).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({ content: "Partial", error: ASSISTANT_INTERRUPTED_ERROR })
    );
    expect(streamAssistantMessage).toHaveBeenCalledTimes(1);
    expect(useAssistantStore.getState().streamingMessageId).toBeNull();
  });

  it("starts a new chat when the remembered conversation no longer exists", async () => {
    getAssistantConversation.mockRejectedValue({ response: { status: 404 } });

    renderPodi();

    await waitFor(() => expect(useAssistantStore.getState().selectedConversationId).toBeNull());
  });

  it("refetches the conversation after the re-attach retries run out and shows the finished reply", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getAssistantConversation.mockResolvedValueOnce(detail("streaming")).mockResolvedValueOnce(detail("done", "Final text"));
    streamAssistantMessage.mockResolvedValue(undefined);

    renderPodi();
    await waitFor(() => expect(streamAssistantMessage).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });

    await waitFor(() => expect(useAssistantStore.getState().messages.at(-1)?.content).toBe("Final text"));
    expect(streamAssistantMessage).toHaveBeenCalledTimes(4);
    expect(getAssistantConversation).toHaveBeenCalledTimes(2);
    expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({ error: null, isStreaming: false });
  });
});

