"use client";

import { useListingStreamStore } from "@/stores/listing-stream";

export const useListingLive = () =>
  useListingStreamStore(
    (state) => state.isOpen && state.order.some((productId) => state.products[productId]?.status === "streaming")
  );
