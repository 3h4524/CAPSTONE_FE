import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useAssistantStore } from "@/stores/assistant";
import { renderQueryHook } from "@/test/render-query-hook";
import { act } from "@testing-library/react";

const streamAssistantChat = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  streamAssistantChat: (...args: unknown[]) => streamAssistantChat(...args),
}));

const initialState = useAssistantStore.getState();

const run = (action: () => void) =>
  act(async () => {
    action();
    await Promise.resolve();
  });

describe("useAssistantChat", () => {
  beforeEach(() => {
    useAssistantStore.setState(initialState, true);
    streamAssistantChat.mockReset();
    streamAssistantChat.mockResolvedValue(undefined);
  });

  it("ignores blank messages", () => {
    const { result } = renderQueryHook(() => useAssistantChat());

    act(() => result.current.send("   "));

    expect(streamAssistantChat).not.toHaveBeenCalled();
    expect(useAssistantStore.getState().messages).toEqual([]);
  });

  it("adds the exchange to the store and streams with the current context", async () => {
    const { result } = renderQueryHook(() => useAssistantChat());

    await run(() => result.current.send("  Hello  "));

    expect(useAssistantStore.getState().messages[0]).toMatchObject({ role: "user", content: "Hello" });
    const [input] = streamAssistantChat.mock.calls[0] as [{ message: string; conversationId: string | null; context: { route: string } }];
    expect(input).toMatchObject({ message: "Hello", conversationId: null });
    expect(input.context.route).toBe("/");
  });

  it("does not send a second message while one is streaming", async () => {
    streamAssistantChat.mockImplementation(() => new Promise(() => undefined));
    const { result } = renderQueryHook(() => useAssistantChat());

    await run(() => result.current.send("first"));
    await run(() => result.current.send("second"));

    expect(streamAssistantChat).toHaveBeenCalledTimes(1);
    expect(result.current.isStreaming).toBe(true);
  });

  it("treats an aborted request as a stop, not an error", async () => {
    streamAssistantChat.mockImplementation((_input: unknown, _onEvent: unknown, signal: AbortSignal) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
    );
    const { result } = renderQueryHook(() => useAssistantChat());
    await run(() => result.current.send("hello"));

    await run(() => result.current.stop());

    const message = useAssistantStore.getState().messages.at(-1);
    expect(message?.error).toBeNull();
    expect(useAssistantStore.getState().streamingMessageId).toBeNull();
  });

  it("records a request failure on the streaming message", async () => {
    streamAssistantChat.mockRejectedValue(new Error("network down"));
    const { result } = renderQueryHook(() => useAssistantChat());

    await run(() => result.current.send("hello"));

    expect(useAssistantStore.getState().messages.at(-1)?.error?.code).toBe("request_failed");
  });

  it("ends the stream with an error when it closes without a done event", async () => {
    const { result } = renderQueryHook(() => useAssistantChat());

    await run(() => result.current.send("hello"));

    expect(useAssistantStore.getState().messages.at(-1)?.error?.code).toBe("stream_interrupted");
    expect(useAssistantStore.getState().streamingMessageId).toBeNull();
    expect(result.current.isStreaming).toBe(false);
  });

  it("keeps a completed stream free of errors", async () => {
    streamAssistantChat.mockImplementation((_input: unknown, onEvent: (event: unknown) => void) => {
      onEvent({ type: "delta", data: { text: "Hi" } });
      onEvent({ type: "done", data: { assistantMessageId: "server-id", model: "m" } });
      return Promise.resolve();
    });
    const { result } = renderQueryHook(() => useAssistantChat());

    await run(() => result.current.send("hello"));

    const message = useAssistantStore.getState().messages.at(-1);
    expect(message).toMatchObject({ content: "Hi", error: null, isStreaming: false });
  });

  it("retries in place: resends the failed prompt without adding a second user message", async () => {
    streamAssistantChat.mockRejectedValueOnce(new Error("fail")).mockImplementation(() => new Promise(() => undefined));
    const { result } = renderQueryHook(() => useAssistantChat());
    await run(() => result.current.send("question"));
    const failed = useAssistantStore.getState().messages.at(-1);

    await run(() => result.current.retry(failed?.key ?? ""));

    const { messages, streamingMessageId } = useAssistantStore.getState();
    expect(streamAssistantChat).toHaveBeenCalledTimes(2);
    expect((streamAssistantChat.mock.calls[1]?.[0] as { message: string }).message).toBe("question");
    expect(messages.filter((message) => message.role === "user")).toHaveLength(1);
    expect(messages).toHaveLength(2);
    expect(messages.some((message) => message.key === failed?.key)).toBe(false);
    expect(messages.at(-1)).toMatchObject({ isStreaming: true, error: null });
    expect(streamingMessageId).toBe(messages.at(-1)?.id);
  });

  it("does not retry a failed reply that is no longer the latest message", async () => {
    streamAssistantChat.mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce(undefined);
    const { result } = renderQueryHook(() => useAssistantChat());
    await run(() => result.current.send("first"));
    const failed = useAssistantStore.getState().messages.at(-1);
    await run(() => result.current.send("second"));
    streamAssistantChat.mockClear();

    await run(() => result.current.retry(failed?.key ?? ""));

    expect(streamAssistantChat).not.toHaveBeenCalled();
  });

  it.each([
    ["starting a new chat", (chat: ReturnType<typeof useAssistantChat>) => chat.startNewConversation()],
    ["opening another conversation", (chat: ReturnType<typeof useAssistantChat>) => chat.openConversation("c-other")],
  ])("stops the active stream and ignores its late events when %s", async (_label, leave) => {
    let emit: (event: unknown) => void = () => undefined;
    let finish: () => void = () => undefined;
    let signal: AbortSignal | null = null;
    streamAssistantChat.mockImplementationOnce(
      (_input: unknown, onEvent: (event: unknown) => void, abortSignal: AbortSignal) =>
        new Promise<void>((resolve) => {
          emit = onEvent;
          finish = resolve;
          signal = abortSignal;
        })
    );
    streamAssistantChat.mockImplementation(() => new Promise(() => undefined));
    const { result } = renderQueryHook(() => useAssistantChat());
    await run(() => result.current.send("old question"));

    await run(() => leave(result.current));
    await run(() => result.current.send("new question"));
    await run(() => {
      emit({ type: "conversation", data: { conversationId: "old-conversation", userMessageId: "u-old" } });
      emit({ type: "delta", data: { text: "old answer" } });
      finish();
    });

    const state = useAssistantStore.getState();
    expect((signal as AbortSignal | null)?.aborted).toBe(true);
    expect(state.conversationId).toBeNull();
    expect(state.messages.map((message) => message.content)).toEqual(["new question", ""]);
    expect(state.messages.at(-1)).toMatchObject({ isStreaming: true, error: null });
  });

  it("ignores opening the conversation that is already open", async () => {
    streamAssistantChat.mockImplementation(() => new Promise(() => undefined));
    useAssistantStore.setState({ conversationId: "c-1", selectedConversationId: "c-1" });
    const { result } = renderQueryHook(() => useAssistantChat());
    await run(() => result.current.send("hello"));

    await run(() => result.current.openConversation("c-1"));

    expect(useAssistantStore.getState().messages).toHaveLength(2);
    expect(result.current.isStreaming).toBe(true);
  });
});
