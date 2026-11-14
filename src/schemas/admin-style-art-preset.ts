import { z } from "zod";

export const adminStyleArtPresetSchema = z.object({
  name: z.string().trim().min(2, "Give the style a name (at least 2 characters).").max(120),
  description: z.string().trim().min(10, "Add a little more detail (at least 10 characters).").max(2000),
  styleModifiers: z.string().trim().max(500),
  recommendationsText: z.string().max(500, "Keep recommendations under 500 characters."),
  viName: z.string().trim().max(120),
  viDescription: z.string().trim().max(2000),
  viRecommendationsText: z.string().max(500, "Keep Vietnamese recommendations under 500 characters."),
});

export type AdminStyleArtPresetFormValues = z.infer<typeof adminStyleArtPresetSchema>;
