import { beforeEach, describe, expect, it } from "vitest";

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
    startExchange();
    const { applyStreamEvent } = useAssistantStore.getState();

    applyStreamEvent({ type: "conversation", data: { conversationId: "c-1", userMessageId: "u-1" } });
    applyStreamEvent({ type: "delta", data: { text: "Hello" } });
    applyStreamEvent({ type: "done", data: { assistantMessageId: "m-1", model: "m", inputTokens: 1, outputTokens: 1 } });

    const state = useAssistantStore.getState();
    expect(state.conversationId).toBe("c-1");
    expect(state.messages.at(-1)).toMatchObject({ id: "m-1", content: "Hello", isStreaming: false });
    expect(state.streamingMessageId).toBeNull();
  });

  it("stopStreaming keeps the partial text and clears the streaming flag", () => {
    startExchange();
    useAssistantStore.getState().applyStreamEvent({ type: "delta", data: { text: "part" } });

    useAssistantStore.getState().stopStreaming();

    const state = useAssistantStore.getState();
    expect(state.messages.at(-1)).toMatchObject({ content: "part", isStreaming: false, error: null });
    expect(state.streamingMessageId).toBeNull();
  });

  it("failStreaming attaches the error to the streaming message", () => {
    startExchange();

    useAssistantStore.getState().failStreaming({ code: "request_failed", message: "Boom" });

    expect(useAssistantStore.getState().messages.at(-1)?.error).toEqual({ code: "request_failed", message: "Boom" });
  });

  it("startNewConversation resets the chat", () => {
    startExchange();
    useAssistantStore.getState().stopStreaming();

    useAssistantStore.getState().startNewConversation();

    const state = useAssistantStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.conversationId).toBeNull();
    expect(state.selectedConversationId).toBeNull();
  });

  it("does not switch conversation while streaming", () => {
    startExchange();

    useAssistantStore.getState().selectConversation("c-9");

    expect(useAssistantStore.getState().messages).toHaveLength(2);
    expect(useAssistantStore.getState().selectedConversationId).toBeNull();
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
