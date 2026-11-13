import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { stopAssistantMessage, streamAssistantMessage } from "@/api/assistant";
import { server } from "@/test/mocks/server";
import type { AssistantStreamEntry } from "@/types/assistant";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

const sseResponse = (body: string) => new HttpResponse(body, { headers: { "Content-Type": "text/event-stream" } });

const collect = async (lastEventId: string | null) => {
  const events: AssistantStreamEntry[] = [];
  await streamAssistantMessage("a-1", lastEventId, (event) => events.push(event), new AbortController().signal);
  return events;
};

describe("streamAssistantMessage", () => {
  it("sends Last-Event-ID and yields the replayed events with their ids", async () => {
    let lastEventIdHeader: string | null = "unset";
    server.use(
      http.get(`${API}/api/assistant/messages/:messageId/stream`, ({ request }) => {
        lastEventIdHeader = request.headers.get("Last-Event-ID");
        return sseResponse('id: 8-0\nevent: delta\ndata: {"text":"more"}\n\nid: 9-0\nevent: done\ndata: {"assistantMessageId":"a-1"}\n\n');
      })
    );

    const events = await collect("7-0");

    expect(lastEventIdHeader).toBe("7-0");
    expect(events).toEqual([
      { id: "8-0", type: "delta", data: { text: "more" } },
      { id: "9-0", type: "done", data: { assistantMessageId: "a-1" } },
    ]);
  });

  it("omits Last-Event-ID to replay from the start", async () => {
    let lastEventIdHeader: string | null = "unset";
    server.use(
      http.get(`${API}/api/assistant/messages/:messageId/stream`, ({ request }) => {
        lastEventIdHeader = request.headers.get("Last-Event-ID");
        return sseResponse("");
      })
    );

    await collect(null);

    expect(lastEventIdHeader).toBeNull();
  });

  it("rejects with the parsed problem details when the stream is gone", async () => {
    server.use(
      http.get(`${API}/api/assistant/messages/:messageId/stream`, () =>
        HttpResponse.json({ title: "Stream not found", code: "assistant.stream_not_found" }, { status: 404 })
      )
    );

    await expect(collect(null)).rejects.toMatchObject({
      response: { status: 404, data: { code: "assistant.stream_not_found" } },
    });
  });
});

describe("stopAssistantMessage", () => {
  it("posts to the stop endpoint of the message", async () => {
    let stoppedId: string | null = null;
    server.use(
      http.post(`${API}/api/assistant/messages/:messageId/stop`, ({ params }) => {
        stoppedId = String(params.messageId);
        return new HttpResponse(null, { status: 202 });
      })
    );

    await stopAssistantMessage("a-1");

    expect(stoppedId).toBe("a-1");
  });
});
