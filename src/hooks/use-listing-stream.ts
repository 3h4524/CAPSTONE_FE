"use client";

import { useCallback } from "react";

import { streamListing } from "@/api/listing-streams";
import { LISTING_STREAM_RETRY_LIMIT } from "@/constants/listing-stream";
import { Log } from "@/helpers/log";
import { useListingStreamStore } from "@/stores/listing-stream";
import type { ListingStreamEntry } from "@/types/listing-stream";
import { uuid } from "@/utils/uuid";

let activeStream: AbortController | null = null;

const applyEvent = (event: ListingStreamEntry) => {
  const store = useListingStreamStore.getState();
  if (event.type === "start") store.start(event.data.productId);
  else if (event.type === "delta") store.append(event.data.productId, event.data.text);
  else if (event.type === "reset") store.restart(event.data.productId);
  else if (event.type === "done") store.finish(event.data.productId, event.data.listing);
  else if (event.type === "failed") store.fail(event.data.productId, event.data.message ?? null);
};

const followStream = async (streamId: string, signal: AbortSignal) => {
  let lastEventId: string | null = null;
  let ended = false;
  for (let attempt = 0; attempt < LISTING_STREAM_RETRY_LIMIT && !ended && !signal.aborted; attempt++) {
    try {
      await streamListing(
        streamId,
        lastEventId,
        (event) => {
          if (event.id) lastEventId = event.id;
          if (event.type === "end") ended = true;
          else applyEvent(event);
        },
        signal
      );
    } catch (error) {
      if (signal.aborted) return;
      Log.warn({ prefix: "listing-stream", message: "Listing stream dropped", data: error });
    }
  }
  if (useListingStreamStore.getState().streamId === streamId) useListingStreamStore.getState().close();
};

export const useListingStream = () => {
  const openStream = useCallback(() => {
    activeStream?.abort();
    const controller = new AbortController();
    activeStream = controller;
    const streamId = uuid();
    useListingStreamStore.getState().open(streamId);
    void followStream(streamId, controller.signal);
    return streamId;
  }, []);

  return { openStream };
};
