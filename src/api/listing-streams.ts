import { api } from "@/api/client";
import { readListingStream } from "@/helpers/listing-stream";
import type { ListingStreamEntry } from "@/types/listing-stream";

export const streamListing = async (
  streamId: string,
  lastEventId: string | null,
  onEvent: (event: ListingStreamEntry) => void,
  signal: AbortSignal
): Promise<void> => {
  const response = await api.get<ReadableStream<Uint8Array>>(`/api/listing-streams/${streamId}`, {
    adapter: "fetch",
    responseType: "stream",
    signal,
    headers: lastEventId
      ? { Accept: "text/event-stream", "Last-Event-ID": lastEventId }
      : { Accept: "text/event-stream" },
  });
  await readListingStream(response.data, onEvent);
};
