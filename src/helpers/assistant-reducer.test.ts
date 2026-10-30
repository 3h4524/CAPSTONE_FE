import { describe, expect, it } from "vitest";

import {
  type AssistantChatState,
  createAssistantPlaceholder,
  createUserMessage,
  reduceAssistantStreamEvent,
} from "@/helpers/assistant-reducer";
import type { AssistantStreamEvent, AssistantUiMessage } from "@/types/assistant";

const buildStreamingState = (): AssistantChatState => {
  const user = createUserMessage("Hello");
  const placeholder = createAssistantPlaceholder();
  return { conversationId: null, messages: [user, placeholder], pendingActions: {}, streamingMessageId: placeholder.id };
};

const lastMessage = (state: AssistantChatState): AssistantUiMessage => {
  const message = state.messages.at(-1);
  if (!message) throw new Error("no message");
  return message;
};

const reduceAll = (state: AssistantChatState, events: AssistantStreamEvent[]) =>
  events.reduce(reduceAssistantStreamEvent, state);

describe("reduceAssistantStreamEvent", () => {
  it("stores the conversation id and renames the last user message", () => {
    const state = reduceAssistantStreamEvent(buildStreamingState(), {
      type: "conversation",
      data: { conversationId: "c-1", userMessageId: "u-1" },
    });

    expect(state.conversationId).toBe("c-1");
    expect(state.messages[0]?.id).toBe("u-1");
  });

  it("appends delta text to the streaming message", () => {
    const state = reduceAll(buildStreamingState(), [
      { type: "delta", data: { text: "Hel" } },
      { type: "delta", data: { text: "lo" } },
    ]);

    expect(lastMessage(state).content).toBe("Hello");
  });

  it("tracks a tool from running to finished", () => {
    const started = reduceAssistantStreamEvent(buildStreamingState(), {
      type: "tool_started",
      data: { callId: "t-1", name: "search_faq" },
    });
    const finished = reduceAssistantStreamEvent(started, {
      type: "tool_finished",
      data: { callId: "t-1", name: "search_faq", ok: true },
    });
    const failed = reduceAssistantStreamEvent(started, {
      type: "tool_finished",
      data: { callId: "t-1", name: "search_faq", ok: false },
    });

    expect(lastMessage(started).tools).toEqual([{ callId: "t-1", name: "search_faq", status: "running" }]);
    expect(lastMessage(finished).tools[0]?.status).toBe("ok");
    expect(lastMessage(failed).tools[0]?.status).toBe("failed");
  });

  it("merges citations distinct by document id", () => {
    const citation = { documentId: "d-1", title: "Guide", sourceUrl: null };
    const state = reduceAll(buildStreamingState(), [
      { type: "citations", data: { items: [citation] } },
      { type: "citations", data: { items: [citation, { documentId: "d-2", title: "Other", sourceUrl: null }] } },
    ]);

    expect(lastMessage(state).citations.map((item) => item.documentId)).toEqual(["d-1", "d-2"]);
  });

  it("records a client action as idle", () => {
    const state = reduceAssistantStreamEvent(buildStreamingState(), {
      type: "client_action",
      data: { id: "a-1", kind: "navigate", payload: { path: "/dashboard", label: "Dashboard" } },
    });

    expect(lastMessage(state).clientActions).toHaveLength(1);
    expect(lastMessage(state).clientActionStates).toEqual({ "a-1": "idle" });
  });

  it("registers a pending action in the map and on the message", () => {
    const state = reduceAssistantStreamEvent(buildStreamingState(), {
      type: "pending_action",
      data: { id: "p-1", toolName: "start_workflow_run", title: "Run", summary: "Run it", status: "pending", expiresAt: "2026-01-01T00:00:00Z" },
    });

    expect(state.pendingActions["p-1"]?.title).toBe("Run");
    expect(lastMessage(state).pendingActionIds).toEqual(["p-1"]);
  });

  it("sets choices as unused", () => {
    const choices = { question: "Which?", options: [{ label: "A", value: "a" }], allowFreeText: true };
    const state = reduceAssistantStreamEvent(buildStreamingState(), { type: "choices", data: choices });

    expect(lastMessage(state).choices).toEqual(choices);
    expect(lastMessage(state).choicesUsed).toBe(false);
  });

  it("renames the message and stops streaming on done", () => {
    const state = reduceAssistantStreamEvent(buildStreamingState(), {
      type: "done",
      data: { assistantMessageId: "m-1", model: "gemini", inputTokens: 1, outputTokens: 2 },
    });

    expect(lastMessage(state).id).toBe("m-1");
    expect(lastMessage(state).isStreaming).toBe(false);
    expect(state.streamingMessageId).toBeNull();
  });

  it("keeps message keys stable when the server assigns ids", () => {
    const initial = buildStreamingState();
    const [user, placeholder] = initial.messages;

    const state = reduceAll(initial, [
      { type: "conversation", data: { conversationId: "c-1", userMessageId: "u-1" } },
      { type: "done", data: { assistantMessageId: "m-1", model: "gemini", inputTokens: 1, outputTokens: 2 } },
    ]);

    expect(state.messages.map((message) => message.id)).toEqual(["u-1", "m-1"]);
    expect(state.messages.map((message) => message.key)).toEqual([user?.key, placeholder?.key]);
  });

  it("records the error and stops streaming on error", () => {
    const state = reduceAssistantStreamEvent(buildStreamingState(), {
      type: "error",
      data: { code: "assistant.model_failed", message: "Model unavailable" },
    });

    expect(lastMessage(state).error).toEqual({ code: "assistant.model_failed", message: "Model unavailable" });
    expect(lastMessage(state).isStreaming).toBe(false);
    expect(state.streamingMessageId).toBeNull();
  });

  it("ignores events other than conversation when nothing is streaming", () => {
    const idle: AssistantChatState = { ...buildStreamingState(), streamingMessageId: null };

    const state = reduceAssistantStreamEvent(idle, { type: "delta", data: { text: "late" } });

    expect(state).toBe(idle);
  });
});
