import { beforeEach, describe, expect, it } from "vitest";

import { ASSISTANT_MAX_MESSAGE_LENGTH, ASSISTANT_NEW_CHAT_DRAFT_KEY } from "@/constants/assistant";
import { createAssistantPlaceholder, createUserMessage } from "@/helpers/assistant-reducer";
import { useAssistantStore } from "@/stores/assistant";
import type { AssistantPendingAction } from "@/types/assistant";

const initialState = useAssistantStore.getState();

const startExchange = () => {
  const user = createUserMessage("Hi");
  const placeholder = createAssistantPlaceholder();
  useAssistantStore.getState().beginExchange(user, placeholder);
  return { user, placeholder };
};

const pending: AssistantPendingAction = {
  id: "p-1",
  toolName: "start_workflow_run",
  title: "Run",
  summary: "Starts",
  status: "pending",
  expiresAt: "2026-10-29T12:00:00Z",
};

describe("useAssistantStore", () => {
  beforeEach(() => {
    useAssistantStore.setState(initialState, true);
  });

  it("toggles the panel", () => {
    useAssistantStore.getState().toggleOpen();
    expect(useAssistantStore.getState().isOpen).toBe(true);
    useAssistantStore.getState().setOpen(false);
    expect(useAssistantStore.getState().isOpen).toBe(false);
  });

  it("beginExchange adds both messages and marks the placeholder as streaming", () => {
    const { placeholder } = startExchange();

    const state = useAssistantStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.streamingMessageId).toBe(placeholder.id);
  });

  it("applies a stream of events and finishes on done", () => {
    const { placeholder } = startExchange();
    const { applyStreamEvent } = useAssistantStore.getState();

    applyStreamEvent(placeholder.id, { type: "conversation", data: { conversationId: "c-1", userMessageId: "u-1" } });
    applyStreamEvent(placeholder.id, { type: "delta", data: { text: "Hello" } });
    applyStreamEvent(placeholder.id, { type: "done", data: { assistantMessageId: "m-1", model: "m", inputTokens: 1, outputTokens: 1 } });

    const state = useAssistantStore.getState();
    expect(state.conversationId).toBe("c-1");
    expect(state.messages.at(-1)).toMatchObject({ id: "m-1", content: "Hello", isStreaming: false });
    expect(state.streamingMessageId).toBeNull();
  });

  it("stopStreaming keeps the partial text and clears the streaming flag", () => {
    const { placeholder } = startExchange();
    useAssistantStore.getState().applyStreamEvent(placeholder.id, { type: "delta", data: { text: "part" } });

    useAssistantStore.getState().stopStreaming(placeholder.id);

    const state = useAssistantStore.getState();
    expect(state.messages.at(-1)).toMatchObject({ content: "part", isStreaming: false, error: null });
    expect(state.streamingMessageId).toBeNull();
  });

  it("failStreaming attaches the error to the streaming message", () => {
    const { placeholder } = startExchange();

    useAssistantStore.getState().failStreaming(placeholder.id, { code: "request_failed", message: "Boom" });

    expect(useAssistantStore.getState().messages.at(-1)?.error).toEqual({ code: "request_failed", message: "Boom" });
  });

  it("startNewConversation resets the chat", () => {
    const { placeholder } = startExchange();
    useAssistantStore.getState().stopStreaming(placeholder.id);

    useAssistantStore.getState().startNewConversation();

    const state = useAssistantStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.conversationId).toBeNull();
    expect(state.selectedConversationId).toBeNull();
  });

  it("switches conversation even while streaming and drops the old stream's state", () => {
    startExchange();

    useAssistantStore.getState().selectConversation("c-9");

    expect(useAssistantStore.getState().messages).toEqual([]);
    expect(useAssistantStore.getState().streamingMessageId).toBeNull();
    expect(useAssistantStore.getState().selectedConversationId).toBe("c-9");
  });

  it("ignores events, stops and failures from a stream that is no longer the active one", () => {
    const { placeholder: stale } = startExchange();
    useAssistantStore.getState().startNewConversation();
    const { placeholder: current } = startExchange();
    const { applyStreamEvent, stopStreaming, failStreaming } = useAssistantStore.getState();

    applyStreamEvent(stale.id, { type: "conversation", data: { conversationId: "old", userMessageId: "u-old" } });
    applyStreamEvent(stale.id, { type: "delta", data: { text: "old answer" } });
    stopStreaming(stale.id);
    failStreaming(stale.id, { code: "stream_interrupted", message: "Interrupted" });

    const state = useAssistantStore.getState();
    expect(state.conversationId).toBeNull();
    expect(state.streamingMessageId).toBe(current.id);
    expect(state.messages.at(-1)).toMatchObject({ content: "", error: null, isStreaming: true });
  });

  it("retryExchange replaces the failed reply with a new streaming placeholder", () => {
    const { user, placeholder } = startExchange();
    useAssistantStore.getState().failStreaming(placeholder.id, { code: "request_failed", message: "Boom" });
    const retryPlaceholder = createAssistantPlaceholder();

    useAssistantStore.getState().retryExchange(placeholder.key, retryPlaceholder);

    const state = useAssistantStore.getState();
    expect(state.messages.map((message) => message.id)).toEqual([user.id, retryPlaceholder.id]);
    expect(state.streamingMessageId).toBe(retryPlaceholder.id);
  });

  it("keeps drafts per conversation, drops blank ones and caps their length", () => {
    const { setDraft } = useAssistantStore.getState();

    setDraft("c-1", "half typed");
    setDraft("c-2", "a".repeat(ASSISTANT_MAX_MESSAGE_LENGTH + 10));
    setDraft("c-3", "temp");
    setDraft("c-3", "   ");

    const { drafts } = useAssistantStore.getState();
    expect(drafts["c-1"]).toBe("half typed");
    expect(drafts["c-2"]).toHaveLength(ASSISTANT_MAX_MESSAGE_LENGTH);
    expect(drafts).not.toHaveProperty("c-3");
  });

  it("moves the new-chat draft to the conversation id the stream assigns", () => {
    const { placeholder } = startExchange();
    useAssistantStore.getState().setDraft(ASSISTANT_NEW_CHAT_DRAFT_KEY, "typed while waiting");

    useAssistantStore
      .getState()
      .applyStreamEvent(placeholder.id, { type: "conversation", data: { conversationId: "c-1", userMessageId: "u-1" } });

    expect(useAssistantStore.getState().drafts).toEqual({ "c-1": "typed while waiting" });
  });

  it("selectConversation clears the thread and remembers the id", () => {
    useAssistantStore.getState().selectConversation("c-9");

    expect(useAssistantStore.getState().selectedConversationId).toBe("c-9");
    expect(useAssistantStore.getState().messages).toEqual([]);
  });

  it("marks choices used and records client action state", () => {
    const { placeholder } = startExchange();

    useAssistantStore.getState().markChoicesUsed(placeholder.id);
    useAssistantStore.getState().setClientActionState(placeholder.id, "act-1", "applied");

    const message = useAssistantStore.getState().messages.at(-1);
    expect(message?.choicesUsed).toBe(true);
    expect(message?.clientActionStates).toEqual({ "act-1": "applied" });
  });

  it("upserts pending actions by id", () => {
    useAssistantStore.getState().upsertPendingAction(pending);
    useAssistantStore.getState().upsertPendingAction({ ...pending, status: "executed" });

    expect(useAssistantStore.getState().pendingActions["p-1"]?.status).toBe("executed");
  });
});
