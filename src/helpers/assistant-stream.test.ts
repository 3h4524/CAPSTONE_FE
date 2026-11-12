import { describe, expect, it } from "vitest";

import { createAssistantStreamParser, readAssistantStream } from "@/helpers/assistant-stream";

const deltaBlock = (text: string) => `event: delta\ndata: {"text":"${text}"}\n\n`;

describe("createAssistantStreamParser", () => {
  it("parses a complete event", () => {
    const parser = createAssistantStreamParser();

    expect(parser.push(deltaBlock("Hi"))).toEqual([{ type: "delta", data: { text: "Hi" } }]);
  });

  it("parses a retrying status event", () => {
    const parser = createAssistantStreamParser();

    expect(parser.push('event: status\ndata: {"state":"retrying","retryInSeconds":8}\n\n')).toEqual([
      { type: "status", data: { state: "retrying", retryInSeconds: 8 } },
    ]);
  });

  it("joins an event split across two chunks", () => {
    const parser = createAssistantStreamParser();

    const first = parser.push('event: delta\ndata: {"te');
    const second = parser.push('xt":"Hi"}\n\n');

    expect(first).toEqual([]);
    expect(second).toEqual([{ type: "delta", data: { text: "Hi" } }]);
  });

  it("returns every event contained in one chunk", () => {
    const parser = createAssistantStreamParser();

    const events = parser.push(deltaBlock("A") + deltaBlock("B"));

    expect(events.map((event) => event.type)).toEqual(["delta", "delta"]);
  });

  it("normalises CRLF line endings", () => {
    const parser = createAssistantStreamParser();

    const events = parser.push('event: delta\r\ndata: {"text":"Hi"}\r\n\r\n');

    expect(events).toEqual([{ type: "delta", data: { text: "Hi" } }]);
  });

  it("ignores comment lines", () => {
    const parser = createAssistantStreamParser();

    const events = parser.push(`: keep-alive\n${deltaBlock("Hi")}`);

    expect(events).toEqual([{ type: "delta", data: { text: "Hi" } }]);
  });

  it("joins multiple data lines with a newline", () => {
    const parser = createAssistantStreamParser();

    const events = parser.push('event: delta\ndata: {"text":\ndata: "Hi"}\n\n');

    expect(events).toEqual([{ type: "delta", data: { text: "Hi" } }]);
  });

  it("drops events with malformed JSON", () => {
    const parser = createAssistantStreamParser();

    const events = parser.push(`event: delta\ndata: {oops\n\n${deltaBlock("Hi")}`);

    expect(events).toEqual([{ type: "delta", data: { text: "Hi" } }]);
  });

  it("drops events of an unknown type", () => {
    const parser = createAssistantStreamParser();

    const events = parser.push(`event: mystery\ndata: {"a":1}\n\n${deltaBlock("Hi")}`);

    expect(events).toEqual([{ type: "delta", data: { text: "Hi" } }]);
  });

  it("flushes a trailing event that has no blank line", () => {
    const parser = createAssistantStreamParser();

    const pushed = parser.push('event: delta\ndata: {"text":"Hi"}');
    const flushed = parser.flush();

    expect(pushed).toEqual([]);
    expect(flushed).toEqual([{ type: "delta", data: { text: "Hi" } }]);
    expect(parser.flush()).toEqual([]);
  });

  it("attaches the SSE id to the event it precedes", () => {
    const parser = createAssistantStreamParser();

    const events = parser.push(`id: 1700000000000-0\n${deltaBlock("A")}id: 1700000000000-1\n${deltaBlock("B")}`);

    expect(events).toEqual([
      { id: "1700000000000-0", type: "delta", data: { text: "A" } },
      { id: "1700000000000-1", type: "delta", data: { text: "B" } },
    ]);
  });

  it("reads an id written after the data line", () => {
    const parser = createAssistantStreamParser();

    const events = parser.push('event: delta\ndata: {"text":"Hi"}\nid: 5-0\n\n');

    expect(events).toEqual([{ id: "5-0", type: "delta", data: { text: "Hi" } }]);
  });

  it("parses the assistant message id of the conversation event", () => {
    const parser = createAssistantStreamParser();

    const events = parser.push(
      'id: 1-0\nevent: conversation\ndata: {"conversationId":"c-1","userMessageId":"u-1","assistantMessageId":"a-1"}\n\n'
    );

    expect(events).toEqual([
      { id: "1-0", type: "conversation", data: { conversationId: "c-1", userMessageId: "u-1", assistantMessageId: "a-1" } },
    ]);
  });
});

describe("readAssistantStream", () => {
  it("emits every event with its id from a byte stream split mid-event", async () => {
    const encoder = new TextEncoder();
    const chunks = ["id: 1-0\nevent: del", 'ta\ndata: {"text":"Hi"}\n\nid: 2-0\nevent: delta\ndata: {"text":"!"}'];
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    });
    const received: unknown[] = [];

    await readAssistantStream(stream, (event) => received.push(event));

    expect(received).toEqual([
      { id: "1-0", type: "delta", data: { text: "Hi" } },
      { id: "2-0", type: "delta", data: { text: "!" } },
    ]);
  });
});
