import type { z } from "zod";

import type { listingStreamEventSchema } from "@/schemas/listing-stream";
import type { ListingContentResult } from "@/types/listing-content";

export type ListingStreamEvent = z.infer<typeof listingStreamEventSchema>;

export type ListingStreamEntry = ListingStreamEvent & { id?: string };

export type ListingStreamStatus = "streaming" | "done" | "failed";

export type ListingStreamProduct = {
  productId: string;
  text: string;
  listing: ListingContentResult | null;
  status: ListingStreamStatus;
  message: string | null;
};
