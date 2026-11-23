import type { MockupTemplate } from "@/types/mockup-templates";

const FAILED_MESSAGE = "The photo could not be made. Try again.";

type StreamEvent = { type: string; data: unknown };

const parseBlock = (block: string): StreamEvent | null => {
  const lines = block.split("\n");
  const type = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!type || !data) return null;
  try {
    return { type, data: JSON.parse(data) as unknown };
  } catch {
    return null;
  }
};

const textOf = (data: unknown, key: string) => {
  const value = (data as Record<string, unknown> | null)?.[key];
  return typeof value === "string" ? value : null;
};

/** Hands over the drawn photo's link, and returns the saved photo when this event is the one that says so. */
const handleEvent = (event: StreamEvent, onPreview?: (url: string) => void): MockupTemplate | null => {
  if (event.type === "preview") {
    const url = textOf(event.data, "url");
    if (url?.startsWith("https://")) onPreview?.(url);
  }
  if (event.type === "failed") throw new Error(textOf(event.data, "message") ?? FAILED_MESSAGE);
  return event.type === "saved" ? (event.data as MockupTemplate) : null;
};

/**
 * Follows the making of a model photo: `onPreview` gets its link as soon as it is drawn, and the saved photo is
 * returned. A failure the server reports, or a stream that ends without a photo, rejects.
 */
export const readModelPhotoStream = async (
  stream: ReadableStream<Uint8Array>,
  onPreview?: (url: string) => void
): Promise<MockupTemplate> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let saved: MockupTemplate | null = null;

  const take = (blocks: string[]) => {
    for (const block of blocks) {
      const event = parseBlock(block);
      if (event) saved = handleEvent(event, onPreview) ?? saved;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    take(blocks);
  }
  take([buffer + decoder.decode()]);

  if (!saved) throw new Error(FAILED_MESSAGE);
  return saved;
};
