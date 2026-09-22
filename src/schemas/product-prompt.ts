import { z } from "zod";

export const MAX_EFFECTIVE_PROMPT_LENGTH = 1000;

export const productPromptSchema = z.object({
  subject: z.string().trim().min(1, "The Subject field is required.").max(200),
  artStyle: z.string().trim().min(1, "The Art Style field is required.").max(100),
  moodTone: z.string().trim().min(1, "The Mood Tone field is required.").max(200),
  negativeTerms: z.string().max(500),
  instructions: z.string().max(1000),
});

export type ProductPromptFormValues = z.infer<typeof productPromptSchema>;
