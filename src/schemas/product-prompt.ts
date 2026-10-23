import { z } from "zod";

export const MAX_EFFECTIVE_PROMPT_LENGTH = 1000;

export const MAX_CUSTOM_PROMPT_LENGTH = 1000;

const requiredForTemplate = {
  subject: "The Subject field is required.",
  artStyle: "The Art Style field is required.",
  moodTone: "The Mood Tone field is required.",
} as const;

export const productPromptSchema = z
  .object({
    subject: z.string().trim().max(200),
    artStyle: z.string().trim().max(100),
    moodTone: z.string().trim().max(200),
    negativeTerms: z.string().max(500),
    instructions: z.string().max(1000),
    customPrompt: z.string().max(MAX_CUSTOM_PROMPT_LENGTH, "Keep the image prompt under 1,000 characters."),
  })
  .superRefine((values, context) => {
    // A template needs its subject, style and mood; a custom image prompt says all of it itself.
    if (values.customPrompt.trim()) return;
    for (const [field, message] of Object.entries(requiredForTemplate)) {
      if (!values[field as keyof typeof requiredForTemplate]) context.addIssue({ code: "custom", path: [field], message });
    }
  });

export type ProductPromptFormValues = z.infer<typeof productPromptSchema>;
