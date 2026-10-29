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

  it("retryLast resends the last user message", async () => {
    streamAssistantChat.mockRejectedValueOnce(new Error("fail")).mockResolvedValue(undefined);
    const { result } = renderQueryHook(() => useAssistantChat());
    await run(() => result.current.send("question"));

    await run(() => result.current.retryLast());

    expect(streamAssistantChat).toHaveBeenCalledTimes(2);
    expect((streamAssistantChat.mock.calls[1]?.[0] as { message: string }).message).toBe("question");
  });
});
