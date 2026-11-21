import { LISTING_TAG_COUNT } from "@/constants/listing-stream";
import { Log } from "@/helpers/log";
import { listingStreamEventSchema } from "@/schemas/listing-stream";
import type { ListingStreamEntry, ListingStreamProduct } from "@/types/listing-stream";

export type PartialListing = {
  title: string;
  titleDone: boolean;
  description: string;
  descriptionDone: boolean;
  tags: string[];
};

const ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", '"': '"', "\\": "\\", "/": "/" };

const readJsonString = (text: string, start: number) => {
  let value = "";
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (char === '"') return { value, closed: true };
    if (char !== "\\") {
      value += char;
      continue;
    }
    const code = text[index + 1];
    if (code === undefined) break;
    if (code === "u") {
      const hex = text.slice(index + 2, index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
      value += String.fromCharCode(Number.parseInt(hex, 16));
      index += 5;
      continue;
    }
    value += ESCAPES[code] ?? code;
    index += 1;
  }
  return { value, closed: false };
};

const valueStart = (text: string, key: string, from = 0) => {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"`, "g");
  pattern.lastIndex = from;
  const match = pattern.exec(text);
  return match ? match.index + match[0].length : -1;
};

const readField = (text: string, key: string) => {
  const start = valueStart(text, key);
  return start < 0 ? { value: "", closed: false } : readJsonString(text, start);
};

const readTags = (text: string) => {
  const arrayStart = text.search(/"tags"\s*:\s*\[/);
  if (arrayStart < 0) return [];
  const tags: string[] = [];
  let cursor = arrayStart;
  while (tags.length < LISTING_TAG_COUNT) {
    const start = valueStart(text, "value", cursor);
    if (start < 0) break;
    const tag = readJsonString(text, start);
    if (!tag.closed) break;
    if (tag.value.trim()) tags.push(tag.value.trim());
    cursor = start;
  }
  return tags;
};

export const parsePartialListing = (text: string): PartialListing => {
  const title = readField(text, "title");
  const description = readField(text, "description");
  return {
    title: title.value,
    titleDone: title.closed,
    description: description.value,
    descriptionDone: description.closed,
    tags: readTags(text),
  };
};

const parseBlock = (block: string): ListingStreamEntry | null => {
  const lines = block.split("\n").filter((line) => line !== "" && !line.startsWith(":"));
  const type = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  const id = lines.find((line) => line.startsWith("id:"))?.slice(3).trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
  if (!type || !data) return null;
  try {
    const parsed = listingStreamEventSchema.safeParse({ type, data: JSON.parse(data) });
    if (parsed.success) return id ? { ...parsed.data, id } : parsed.data;
    Log.warn({ prefix: "listing-stream", message: "Dropped unknown stream event", data: type });
    return null;
  } catch {
    Log.warn({ prefix: "listing-stream", message: "Dropped malformed stream event", data: type });
    return null;
  }
};

export const createListingStreamParser = () => {
  let buffer = "";
  const toEvents = (blocks: string[]) =>
    blocks.map(parseBlock).filter((event): event is ListingStreamEntry => event !== null);
  return {
    push: (chunk: string) => {
      buffer += chunk.replace(/\r\n/g, "\n");
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      return toEvents(blocks);
    },
    flush: () => {
      const remaining = buffer;
      buffer = "";
      return remaining.trim() ? toEvents([remaining]) : [];
    },
  };
};

export const readListingStream = async (
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: ListingStreamEntry) => void
) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const parser = createListingStreamParser();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true })).forEach(onEvent);
  }
  parser.push(decoder.decode()).forEach(onEvent);
  parser.flush().forEach(onEvent);
};

export const toListingPreview = (product: ListingStreamProduct): PartialListing => {
  if (!product.listing) return parsePartialListing(product.text);
  return {
    title: product.listing.title,
    titleDone: true,
    description: product.listing.description,
    descriptionDone: true,
    tags: product.listing.tags.map((tag) => tag.value).slice(0, LISTING_TAG_COUNT),
  };
};
