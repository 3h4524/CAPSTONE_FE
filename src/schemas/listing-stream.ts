import { z } from "zod";

const listingTagSchema = z.object({
  value: z.string(),
  type: z.string().nullable(),
  position: z.number(),
});

const listingSchema = z.object({
  productId: z.string(),
  listingContentId: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(listingTagSchema),
  versionNumber: z.number(),
  model: z.string(),
  createdAt: z.string().nullable(),
});

export const listingStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), data: z.object({ productId: z.string(), model: z.string().nullish() }) }),
  z.object({ type: z.literal("delta"), data: z.object({ productId: z.string(), text: z.string() }) }),
  z.object({ type: z.literal("reset"), data: z.object({ productId: z.string() }) }),
  z.object({ type: z.literal("done"), data: z.object({ productId: z.string(), listing: listingSchema }) }),
  z.object({ type: z.literal("failed"), data: z.object({ productId: z.string(), message: z.string().nullish() }) }),
  z.object({ type: z.literal("end"), data: z.object({}).passthrough() }),
]);
