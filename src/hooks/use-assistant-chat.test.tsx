import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as AssistantApi from "@/api/assistant";
import { flushQueuedClientActionStates } from "@/helpers/assistant-client-action-queue";
import { toAssistantChatState } from "@/helpers/assistant-messages";
import { createAssistantPlaceholder, isLatestFailedReply } from "@/helpers/assistant-reducer";
import { showToast } from "@/helpers/toast";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useSettleAssistantClientAction } from "@/hooks/use-settle-assistant-client-action";
import { useAssistantStore } from "@/stores/assistant";
import { renderQueryHook } from "@/test/render-query-hook";
import type { AssistantStreamEntry } from "@/types/assistant";
import { act, waitFor } from "@testing-library/react";

const streamAssistantChat = vi.fn();
const streamAssistantMessage = vi.fn();
const stopAssistantMessage = vi.fn();
const setAssistantClientActionState = vi.fn();

vi.mock("@/api/assistant", async (importOriginal) => ({
  ...(await importOriginal<typeof AssistantApi>()),
  streamAssistantChat: (...args: unknown[]) => streamAssistantChat(...args),
  streamAssistantMessage: (...args: unknown[]) => streamAssistantMessage(...args),
  stopAssistantMessage: (...args: unknown[]) => stopAssistantMessage(...args),
  setAssistantClientActionState: (...args: unknown[]) => setAssistantClientActionState(...args),
}));

vi.mock("@/helpers/toast", () => ({ showToast: vi.fn() }));

type EmitEvent = (event: AssistantStreamEntry) => void;

const holdChatStream = () => {
  const handle: { emit: EmitEvent; finish: () => void; signal: AbortSignal | null } = {
    emit: () => undefined,
    finish: () => undefined,
    signal: null,
  };
  streamAssistantChat.mockImplementationOnce(
    (_input: unknown, onEvent: EmitEvent, signal: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        handle.emit = onEvent;
        handle.finish = resolve;
        handle.signal = signal;
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      })
  );
  return handle;
};

const conversationEvent: AssistantStreamEntry = {
  id: "1-0",
  type: "conversation",
  data: { conversationId: "c-1", userMessageId: "u-1", assistantMessageId: "a-1" },
};

const seedStreamingConversation = (parked: { lastEventId: string; content: string } | null = null) => {
  const store = useAssistantStore.getState();
  if (parked) {
    useAssistantStore.setState({
      parkedStreams: {
        "a-1": { lastEventId: parked.lastEventId, message: { ...createAssistantPlaceholder(), content: parked.content } },
      },
    });
  }
  store.loadConversation(
    toAssistantChatState({
      id: "c-1",
      title: "Chat",
      pendingActions: [],
      messages: [
        { id: "u-1", role: "user", content: "Question", metadata: {}, status: "done", createdAt: "" },
        { id: "a-1", role: "assistant", content: "Partial from server", metadata: {}, status: "streaming", createdAt: "" },
      ],
    })
  );
};

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
    streamAssistantMessage.mockReset();
    streamAssistantMessage.mockReturnValue(new Promise(() => undefined));
    stopAssistantMessage.mockReset();
    stopAssistantMessage.mockResolvedValue(undefined);
    setAssistantClientActionState.mockReset();
    setAssistantClientActionState.mockResolvedValue(undefined);
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

  it("falls back to a local abort when Stop is pressed before the assistant message id is known", async () => {
    streamAssistantChat.mockImplementation((_input: unknown, _onEvent: unknown, signal: AbortSignal) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
    );
    const { result } = renderQueryHook(() => useAssistantChat());
    await run(() => result.current.send("hello"));

    await run(() => result.current.stop());

    const message = useAssistantStore.getState().messages.at(-1);
    expect(message?.error).toBeNull();
    expect(message?.isStopped).toBe(true);
    expect(useAssistantStore.getState().streamingMessageId).toBeNull();
    expect(stopAssistantMessage).not.toHaveBeenCalled();
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
  ])("detaches locally from the active stream and ignores its late events when %s", async (_label, leave) => {
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
    expect(stopAssistantMessage).not.toHaveBeenCalled();
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

  describe("stop", () => {
    it("asks the backend to stop the turn and keeps reading until it ends as stopped", async () => {
      const stream = holdChatStream();
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.send("hello"));
      await run(() => {
        stream.emit(conversationEvent);
        stream.emit({ id: "2-0", type: "delta", data: { text: "Partial" } });
      });

      await run(() => result.current.stop());

      expect(stopAssistantMessage).toHaveBeenCalledWith("a-1", expect.anything());
      expect(stream.signal?.aborted).toBe(false);
      expect(result.current.isStreaming).toBe(true);

      await run(() => {
        stream.emit({ id: "3-0", type: "error", data: { code: "assistant.stopped", message: "Stopped." } });
        stream.finish();
      });

      expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({
        content: "Partial",
        error: null,
        isStopped: true,
        isStreaming: false,
      });
    });

    it("stays quiet when the turn had already finished", async () => {
      stopAssistantMessage.mockRejectedValue({ response: { status: 409, data: { code: "assistant.not_streaming" } } });
      const stream = holdChatStream();
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.send("hello"));
      await run(() => stream.emit(conversationEvent));

      await run(() => result.current.stop());

      expect(showToast).not.toHaveBeenCalled();
    });

    it("shows a toast when the stop request fails for another reason", async () => {
      stopAssistantMessage.mockRejectedValue({ response: { status: 500, data: { title: "Server down" } } });
      const stream = holdChatStream();
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.send("hello"));
      await run(() => stream.emit(conversationEvent));

      await run(() => result.current.stop());

      expect(showToast).toHaveBeenCalledWith("error", "Server down");
    });
  });

  it("keeps the stream attached when the bubble is closed", async () => {
    const stream = holdChatStream();
    const { result } = renderQueryHook(() => useAssistantChat());
    await run(() => result.current.send("hello"));

    await run(() => useAssistantStore.getState().setOpen(false));
    await run(() => {
      stream.emit(conversationEvent);
      stream.emit({ id: "2-0", type: "delta", data: { text: "Still coming" } });
    });

    expect(stream.signal?.aborted).toBe(false);
    expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({ content: "Still coming", isStreaming: true });
  });

  describe("attachToStreamingReply", () => {
    it("replays a loaded streaming reply from the start, replacing the partial text", async () => {
      let emit: EmitEvent = () => undefined;
      streamAssistantMessage.mockImplementation((_id: string, _lastEventId: string | null, onEvent: EmitEvent) => {
        emit = onEvent;
        return new Promise(() => undefined);
      });
      seedStreamingConversation();
      const { result } = renderQueryHook(() => useAssistantChat());

      await run(() => result.current.attachToStreamingReply());

      expect(streamAssistantMessage).toHaveBeenCalledWith("a-1", null, expect.any(Function), expect.any(AbortSignal));
      expect(useAssistantStore.getState().messages.at(-1)?.content).toBe("Partial from server");

      await run(() => {
        emit(conversationEvent);
        emit({ id: "2-0", type: "delta", data: { text: "Fresh" } });
      });

      expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({ content: "Fresh", isStreaming: true });
      expect(result.current.isStreaming).toBe(true);
    });

    it("resumes a parked stream after its last event id and keeps the local text", async () => {
      let emit: EmitEvent = () => undefined;
      streamAssistantMessage.mockImplementation((_id: string, _lastEventId: string | null, onEvent: EmitEvent) => {
        emit = onEvent;
        return new Promise(() => undefined);
      });
      seedStreamingConversation({ lastEventId: "7-0", content: "Local " });
      const { result } = renderQueryHook(() => useAssistantChat());

      await run(() => result.current.attachToStreamingReply());
      await run(() => emit({ id: "8-0", type: "delta", data: { text: "and more" } }));

      expect(streamAssistantMessage).toHaveBeenCalledWith("a-1", "7-0", expect.any(Function), expect.any(AbortSignal));
      expect(useAssistantStore.getState().messages.at(-1)?.content).toBe("Local and more");
    });

    it("does not attach twice to the same reply", async () => {
      seedStreamingConversation();
      const { result } = renderQueryHook(() => useAssistantChat());

      await run(() => {
        result.current.attachToStreamingReply();
        result.current.attachToStreamingReply();
      });
      await run(() => seedStreamingConversation());
      await run(() => result.current.attachToStreamingReply());

      expect(streamAssistantMessage).toHaveBeenCalledTimes(1);
    });

    it("does not attach to a reply that is streaming live", async () => {
      const stream = holdChatStream();
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.send("hello"));
      await run(() => stream.emit(conversationEvent));

      await run(() => result.current.attachToStreamingReply());

      expect(streamAssistantMessage).not.toHaveBeenCalled();
    });

    it("stops the re-attached turn through the backend", async () => {
      seedStreamingConversation();
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.attachToStreamingReply());

      await run(() => result.current.stop());

      expect(stopAssistantMessage).toHaveBeenCalledWith("a-1", expect.anything());
    });

    it("refetches the conversation when the stream no longer exists", async () => {
      streamAssistantMessage.mockRejectedValue({ response: { status: 404, data: { code: "assistant.stream_not_found" } } });
      seedStreamingConversation();
      const { result, queryClient } = renderQueryHook(() => useAssistantChat());
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");

      await run(() => result.current.attachToStreamingReply());

      await waitFor(() =>
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ["assistant", "conversations", "c-1"] })
      );
      const state = useAssistantStore.getState();
      expect(state.streamingMessageId).toBeNull();
      expect(state.goneStreamIds).toEqual(["a-1"]);
      expect(state.messages.at(-1)?.error).toBeNull();
    });
  });

  describe("re-attach after a dropped connection", () => {
    const advance = (ms: number) =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });

    const dropAfterConversation = (extra: AssistantStreamEntry[] = []) =>
      streamAssistantChat.mockImplementationOnce((_input: unknown, onEvent: EmitEvent) => {
        onEvent(conversationEvent);
        extra.forEach(onEvent);
        return Promise.resolve();
      });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("re-attaches from the last event id when the live stream ends without a terminal event", async () => {
      dropAfterConversation([{ id: "2-0", type: "delta", data: { text: "Hel" } }]);
      streamAssistantMessage.mockImplementationOnce((_id: string, _lastEventId: string | null, onEvent: EmitEvent) => {
        onEvent({ id: "3-0", type: "delta", data: { text: "lo" } });
        onEvent({ id: "4-0", type: "done", data: { assistantMessageId: "a-1" } });
        return Promise.resolve();
      });
      const { result } = renderQueryHook(() => useAssistantChat());

      await run(() => result.current.send("hi"));
      expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({ isStreaming: true, error: null });
      expect(streamAssistantMessage).not.toHaveBeenCalled();

      await advance(1000);

      expect(streamAssistantMessage).toHaveBeenCalledWith("a-1", "2-0", expect.any(Function), expect.any(AbortSignal));
      expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({ content: "Hello", isStreaming: false, error: null });
    });

    it("re-attaches when the live stream fails mid-way after the turn started", async () => {
      streamAssistantChat.mockImplementationOnce((_input: unknown, onEvent: EmitEvent) => {
        onEvent(conversationEvent);
        return Promise.reject(new TypeError("network error"));
      });
      const { result } = renderQueryHook(() => useAssistantChat());

      await run(() => result.current.send("hi"));
      await advance(1000);

      expect(streamAssistantMessage).toHaveBeenCalledWith("a-1", "1-0", expect.any(Function), expect.any(AbortSignal));
    });

    it("backs off 1s, 2s and 4s and only then shows the interrupted state", async () => {
      dropAfterConversation();
      streamAssistantMessage.mockRejectedValue(new TypeError("network error"));
      const { result, queryClient } = renderQueryHook(() => useAssistantChat());
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      await run(() => result.current.send("hi"));

      await advance(999);
      expect(streamAssistantMessage).toHaveBeenCalledTimes(0);
      await advance(1);
      expect(streamAssistantMessage).toHaveBeenCalledTimes(1);
      await advance(2000);
      expect(streamAssistantMessage).toHaveBeenCalledTimes(2);
      expect(useAssistantStore.getState().messages.at(-1)?.error).toBeNull();
      await advance(4000);

      expect(streamAssistantMessage).toHaveBeenCalledTimes(3);
      expect(useAssistantStore.getState().messages.at(-1)?.error?.code).toBe("stream_interrupted");
      expect(result.current.isStreaming).toBe(false);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["assistant", "conversations", "c-1"] });
      expect(useAssistantStore.getState()).toMatchObject({ selectedConversationId: "c-1", goneStreamIds: ["a-1"] });
    });

    it("keeps re-attaching while each re-attached stream drops, resuming from the newest id", async () => {
      dropAfterConversation();
      streamAssistantMessage
        .mockImplementationOnce((_id: string, _lastEventId: string | null, onEvent: EmitEvent) => {
          onEvent({ id: "5-0", type: "delta", data: { text: "Part" } });
          return Promise.resolve();
        })
        .mockImplementationOnce((_id: string, _lastEventId: string | null, onEvent: EmitEvent) => {
          onEvent({ id: "6-0", type: "done", data: { assistantMessageId: "a-1" } });
          return Promise.resolve();
        });
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.send("hi"));

      await advance(1000);
      await advance(2000);

      expect(streamAssistantMessage.mock.calls.map((call) => call[1])).toEqual(["1-0", "5-0"]);
      expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({ content: "Part", isStreaming: false, error: null });
    });

    it("shows the interrupted state at once when the stream drops before the turn has an id", async () => {
      const { result } = renderQueryHook(() => useAssistantChat());

      await run(() => result.current.send("hi"));
      await advance(8000);

      expect(streamAssistantMessage).not.toHaveBeenCalled();
      expect(useAssistantStore.getState().messages.at(-1)?.error?.code).toBe("stream_interrupted");
    });

    it.each([
      ["starting a new chat", (chat: ReturnType<typeof useAssistantChat>) => chat.startNewConversation()],
      ["opening another conversation", (chat: ReturnType<typeof useAssistantChat>) => chat.openConversation("c-other")],
    ])("does not re-attach after detaching by %s", async (_label, leave) => {
      const stream = holdChatStream();
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.send("hi"));
      await run(() => stream.emit(conversationEvent));

      await run(() => leave(result.current));
      await advance(8000);

      expect(streamAssistantMessage).not.toHaveBeenCalled();
      expect(useAssistantStore.getState().parkedStreams["a-1"]?.lastEventId).toBe("1-0");
    });

    it("does not re-attach after detaching during the backoff", async () => {
      dropAfterConversation();
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.send("hi"));

      await advance(500);
      await run(() => result.current.startNewConversation());
      await advance(8000);

      expect(streamAssistantMessage).not.toHaveBeenCalled();
    });

    it("re-attaches a dropped re-attach stream from its newest id", async () => {
      streamAssistantMessage
        .mockImplementationOnce((_id: string, _lastEventId: string | null, onEvent: EmitEvent) => {
          onEvent({ id: "1-0", type: "delta", data: { text: "Re" } });
          return Promise.resolve();
        })
        .mockImplementationOnce(() => new Promise(() => undefined));
      seedStreamingConversation();
      const { result } = renderQueryHook(() => useAssistantChat());

      await run(() => result.current.attachToStreamingReply());
      await advance(1000);

      expect(streamAssistantMessage.mock.calls.map((call) => call[1])).toEqual([null, "1-0"]);
      expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({ content: "Re", isStreaming: true });
    });
  });

  describe("terminal events", () => {
    it.each([
      ["assistant.timeout", "The answer took too long."],
      ["assistant.interrupted", "This answer was interrupted."],
    ])("shows %s as an error the latest reply can retry", async (code, message) => {
      const stream = holdChatStream();
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.send("hi"));

      await run(() => {
        stream.emit(conversationEvent);
        stream.emit({ id: "2-0", type: "error", data: { code, message } });
        stream.finish();
      });

      const failed = useAssistantStore.getState().messages.at(-1);
      expect(failed).toMatchObject({ error: { code, message }, isStopped: false, isStreaming: false });
      expect(isLatestFailedReply(useAssistantStore.getState().messages, failed?.key ?? "")).toBe(true);
    });

    it("keeps the message key and local state when done arrives", async () => {
      const stream = holdChatStream();
      const { result } = renderQueryHook(() => useAssistantChat());
      await run(() => result.current.send("hi"));
      const placeholderKey = useAssistantStore.getState().messages.at(-1)?.key;
      await run(() => {
        stream.emit(conversationEvent);
        stream.emit({ id: "2-0", type: "client_action", data: { id: "x1", kind: "navigate", payload: { path: "/dashboard", label: "Go" } } });
        stream.emit({ id: "3-0", type: "choices", data: { question: null, options: [{ label: "A", value: "a" }], allowFreeText: false } });
      });
      const streamingId = useAssistantStore.getState().streamingMessageId ?? "";
      act(() => {
        useAssistantStore.getState().markChoicesUsed(streamingId);
        useAssistantStore.getState().setClientActionState(streamingId, "x1", "dismissed");
      });

      await run(() => {
        stream.emit({ id: "4-0", type: "done", data: { assistantMessageId: "a-1" } });
        stream.finish();
      });

      expect(useAssistantStore.getState().messages.at(-1)).toMatchObject({
        id: "a-1",
        key: placeholderKey,
        choicesUsed: true,
        clientActionStates: { x1: "dismissed" },
      });
    });
  });

  describe("client action chosen while its reply streams", () => {
    const clientActionEvent: AssistantStreamEntry = {
      id: "2-0",
      type: "client_action",
      data: { id: "x1", kind: "navigate", payload: { path: "/dashboard", label: "Go" } },
    };

    const startWithQueuedDismiss = async () => {
      const stream = holdChatStream();
      const rendered = renderQueryHook(() => ({ chat: useAssistantChat(), settle: useSettleAssistantClientAction() }));
      await run(() => rendered.result.current.chat.send("hi"));
      await run(() => {
        stream.emit(conversationEvent);
        stream.emit(clientActionEvent);
      });
      const streamingId = useAssistantStore.getState().streamingMessageId ?? "";
      act(() => rendered.result.current.settle(streamingId, "x1", "dismissed"));
      return { stream, streamingId };
    };

    it("keeps the choice locally and sends it only once the reply is done", async () => {
      const { stream, streamingId } = await startWithQueuedDismiss();

      expect(setAssistantClientActionState).not.toHaveBeenCalled();
      expect(useAssistantStore.getState().messages.find((message) => message.id === streamingId)?.clientActionStates).toEqual({
        x1: "dismissed",
      });

      await run(() => {
        stream.emit({ id: "3-0", type: "done", data: { assistantMessageId: "a-1" } });
        stream.finish();
      });

      expect(setAssistantClientActionState).toHaveBeenCalledWith({ messageId: "a-1", actionId: "x1", state: "dismissed" });
      expect(useAssistantStore.getState().queuedClientActionStates).toEqual({});
    });

    it.each([
      ["an error", { code: "assistant.timeout", message: "Too slow" }],
      ["a stop", { code: "assistant.stopped", message: "Stopped." }],
    ])("waits for the finished row after %s and drops the choice when the row lacks the action", async (_label, error) => {
      const { stream } = await startWithQueuedDismiss();

      await run(() => {
        stream.emit({ id: "3-0", type: "error", data: error });
        stream.finish();
      });
      expect(setAssistantClientActionState).not.toHaveBeenCalled();
      expect(useAssistantStore.getState().queuedClientActionStates).toEqual({ "a-1": { x1: "dismissed" } });

      act(() =>
        useAssistantStore.getState().loadConversation(
          toAssistantChatState({
            id: "c-1",
            title: "Chat",
            pendingActions: [],
            messages: [{ id: "a-1", role: "assistant", content: "", metadata: {}, status: "stopped", createdAt: "" }],
          })
        )
      );
      flushQueuedClientActionStates();

      expect(setAssistantClientActionState).not.toHaveBeenCalled();
      expect(useAssistantStore.getState().queuedClientActionStates).toEqual({});
    });

    it("sends the choice when the finished row loads with the action", async () => {
      const { stream } = await startWithQueuedDismiss();
      await run(() => {
        stream.emit({ id: "3-0", type: "error", data: { code: "assistant.timeout", message: "Too slow" } });
        stream.finish();
      });

      act(() =>
        useAssistantStore.getState().loadConversation(
          toAssistantChatState({
            id: "c-1",
            title: "Chat",
            pendingActions: [],
            messages: [
              {
                id: "a-1",
                role: "assistant",
                content: "",
                metadata: { clientActions: [clientActionEvent.data] },
                status: "error",
                createdAt: "",
              },
            ],
          })
        )
      );
      flushQueuedClientActionStates();

      expect(setAssistantClientActionState).toHaveBeenCalledWith({ messageId: "a-1", actionId: "x1", state: "dismissed" });
      expect(useAssistantStore.getState().messages.at(-1)?.clientActionStates).toEqual({ x1: "dismissed" });
    });
  });
});

