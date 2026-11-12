import type { AxiosError } from "axios";

import { Log } from "@/helpers/log";
import { assistantStreamEventSchema } from "@/schemas/assistant";
import type { AssistantStreamEntry } from "@/types/assistant";

const RATE_LIMIT_MESSAGE = "You're sending messages too quickly. Try again in a minute.";

const parseBlock = (block: string): AssistantStreamEntry | null => {
  const lines = block.split("\n").filter((line) => line !== "" && !line.startsWith(":"));
  const type = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  const id = lines.find((line) => line.startsWith("id:"))?.slice(3).trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
  if (!type || !data) return null;
  try {
    const parsed = assistantStreamEventSchema.safeParse({ type, data: JSON.parse(data) });
    if (parsed.success) return id ? { ...parsed.data, id } : parsed.data;
    Log.warn({ prefix: "assistant-stream", message: "Dropped unknown stream event", data: type });
    return null;
  } catch {
    Log.warn({ prefix: "assistant-stream", message: "Dropped malformed stream event", data: type });
    return null;
  }
};

const toEvents = (blocks: string[]) =>
  blocks.map(parseBlock).filter((event): event is AssistantStreamEntry => event !== null);

export const createAssistantStreamParser = () => {
  let buffer = "";

  return {
    push: (chunk: string): AssistantStreamEntry[] => {
      buffer += chunk.replace(/\r\n/g, "\n");
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      return toEvents(blocks);
    },
    flush: (): AssistantStreamEntry[] => {
      const remaining = buffer;
      buffer = "";
      return remaining.trim() ? toEvents([remaining]) : [];
    },
  };
};

const readStreamText = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
};

const parseErrorText = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const readStreamErrorBody = async (error: AxiosError) => {
  const response = error.response;
  if (!response) return;
  if (response.data instanceof ReadableStream) {
    const text = await readStreamText(response.data);
    response.data = text ? parseErrorText(text) : undefined;
  }
  const isEmpty = response.data === undefined || response.data === null || response.data === "";
  if (response.status === 429 && isEmpty) response.data = { title: RATE_LIMIT_MESSAGE };
};

export const readAssistantStream = async (
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: AssistantStreamEntry) => void
) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const parser = createAssistantStreamParser();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true })).forEach(onEvent);
  }
  parser.push(decoder.decode()).forEach(onEvent);
  parser.flush().forEach(onEvent);
};
