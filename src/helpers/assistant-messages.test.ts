import { describe, expect, it } from "vitest";

import { toAssistantChatState, toAssistantUiMessage } from "@/helpers/assistant-messages";
import type { AssistantMessageDto } from "@/types/assistant";

const dto = (overrides: Partial<AssistantMessageDto> = {}): AssistantMessageDto => ({
  id: "m-1",
  role: "assistant",
  content: "Hi",
  metadata: {},
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("toAssistantUiMessage", () => {
  it("maps full metadata", () => {
    const message = toAssistantUiMessage(
      dto({
        metadata: {
          citations: [{ documentId: "d-1", title: "Guide", sourceUrl: null }],
          toolCalls: [{ name: "search_faq", ok: true }],
          clientActions: [{ id: "a-1", kind: "navigate", payload: { path: "/dashboard", label: "Dashboard" } }],
          pendingActionIds: ["p-1"],
          choices: { question: null, options: [{ label: "A", value: "a" }], allowFreeText: false },
          error: { code: "x", message: "y" },
        },
      })
    );

    expect(message.citations).toHaveLength(1);
    expect(message.tools[0]).toMatchObject({ name: "search_faq", status: "ok" });
    expect(message.key).toBe(message.id);
    expect(message.clientActionStates).toEqual({ "a-1": "idle" });
    expect(message.pendingActionIds).toEqual(["p-1"]);
    expect(message.choices?.options).toHaveLength(1);
    expect(message.error).toEqual({ code: "x", message: "y" });
    expect(message.isStreaming).toBe(false);
  });

  it("falls back to empty values for empty or invalid metadata", () => {
    const empty = toAssistantUiMessage(dto());
    const invalid = toAssistantUiMessage(dto({ metadata: { citations: "nope" } }));

    [empty, invalid].forEach((message) => {
      expect(message.citations).toEqual([]);
      expect(message.tools).toEqual([]);
      expect(message.choices).toBeNull();
      expect(message.error).toBeNull();
    });
  });
});

describe("toAssistantChatState", () => {
  it("leaves choices usable only on the last assistant message", () => {
    const state = toAssistantChatState({
      id: "c-1",
      title: "Chat",
      messages: [dto({ id: "m-1" }), dto({ id: "m-2", role: "user" }), dto({ id: "m-3" })],
      pendingActions: [
        { id: "p-1", toolName: "start_workflow_run", title: "Run", summary: "Run", status: "pending", expiresAt: "2026-01-01T00:00:00Z" },
      ],
    });

    expect(state.conversationId).toBe("c-1");
    expect(state.messages.map((message) => message.choicesUsed)).toEqual([true, true, false]);
    expect(state.pendingActions["p-1"]?.status).toBe("pending");
    expect(state.streamingMessageId).toBeNull();
  });

  it("marks every message as used when the last one is from the user", () => {
    const state = toAssistantChatState({
      id: "c-1",
      title: "Chat",
      messages: [dto({ id: "m-1" }), dto({ id: "m-2", role: "user" })],
      pendingActions: [],
    });

    expect(state.messages.every((message) => message.choicesUsed)).toBe(true);
  });

  it("restores the saved state of client actions and leaves the others idle", () => {
    const action = (id: string) => ({ id, kind: "navigate", payload: { path: "/usage", label: "Usage" } });
    const message = toAssistantUiMessage({
      id: "m",
      role: "assistant",
      content: "x",
      createdAt: "2026-10-29T00:00:00Z",
      metadata: { clientActions: [action("a1"), action("a2")], clientActionStates: { a1: "applied" } },
    });

    expect(message.clientActionStates).toEqual({ a1: "applied", a2: "idle" });
  });
});
