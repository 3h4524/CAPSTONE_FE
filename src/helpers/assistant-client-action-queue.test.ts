import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { flushQueuedClientActionStates } from "@/helpers/assistant-client-action-queue";
import { createAssistantPlaceholder } from "@/helpers/assistant-reducer";
import { useAssistantStore } from "@/stores/assistant";
import { server } from "@/test/mocks/server";
import type { AssistantClientAction, AssistantUiMessage } from "@/types/assistant";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

const navigateAction = (id: string): AssistantClientAction => ({
  id,
  kind: "navigate",
  payload: { path: "/dashboard", label: "Dashboard" },
});

const reply = (overrides: Partial<AssistantUiMessage> = {}): AssistantUiMessage => ({
  ...createAssistantPlaceholder(),
  id: "a-1",
  key: "a-1",
  isStreaming: false,
  clientActions: [navigateAction("x1")],
  clientActionStates: { x1: "idle" },
  ...overrides,
});

const requests: { url: string; body: unknown }[] = [];

describe("flushQueuedClientActionStates", () => {
  beforeEach(() => {
    useAssistantStore.setState(useAssistantStore.getInitialState(), true);
    requests.length = 0;
    server.use(
      http.put(`${API}/api/assistant/messages/:messageId/client-actions/:actionId`, async ({ request }) => {
        requests.push({ url: request.url, body: await request.json() });
        return new HttpResponse(null, { status: 204 });
      })
    );
  });

  it("sends a queued state once its reply has finished and restores it locally", async () => {
    useAssistantStore.setState({ messages: [reply()], queuedClientActionStates: { "a-1": { x1: "applied" } } });

    flushQueuedClientActionStates();

    const state = useAssistantStore.getState();
    expect(state.queuedClientActionStates).toEqual({});
    expect(state.messages[0]?.clientActionStates).toEqual({ x1: "applied" });
    await expect.poll(() => requests).toHaveLength(1);
    expect(requests[0]?.url).toContain("/messages/a-1/client-actions/x1");
    expect(requests[0]?.body).toEqual({ state: "applied" });
  });

  it.each([
    ["the reply is still streaming", [reply({ isStreaming: true })]],
    ["the reply is not in the open chat", [reply({ id: "other" })]],
  ])("keeps the queue when %s", (_label, messages) => {
    useAssistantStore.setState({ messages, queuedClientActionStates: { "a-1": { x1: "applied" } } });

    flushQueuedClientActionStates();

    expect(useAssistantStore.getState().queuedClientActionStates).toEqual({ "a-1": { x1: "applied" } });
    expect(requests).toHaveLength(0);
  });

  it("drops a queued state whose action the finished reply does not have", async () => {
    useAssistantStore.setState({
      messages: [reply({ clientActions: [], clientActionStates: {}, error: { code: "assistant.stopped", message: "" } })],
      queuedClientActionStates: { "a-1": { x1: "dismissed" } },
    });

    flushQueuedClientActionStates();
    await Promise.resolve();

    expect(useAssistantStore.getState().queuedClientActionStates).toEqual({});
    expect(requests).toHaveLength(0);
  });
});
