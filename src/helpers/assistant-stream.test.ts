import { describe, expect, it } from "vitest";

import { createAssistantStreamParser } from "@/helpers/assistant-stream";

const deltaBlock = (text: string) => `event: delta\ndata: {"text":"${text}"}\n\n`;

describe("createAssistantStreamParser", () => {
  it("parses a complete event", () => {
    const parser = createAssistantStreamParser();

    expect(parser.push(deltaBlock("Hi"))).toEqual([{ type: "delta", data: { text: "Hi" } }]);
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
});
