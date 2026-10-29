import { z } from "zod";

const SUPPORTED_PLACEHOLDERS = new Set(["subject", "niche", "style", "keywords"]);

const hasOnlySupportedPlaceholders = (value: string) => {
  const placeholders = value.matchAll(/\{([^{}]+)\}/g);
  return Array.from(placeholders).every((match) => SUPPORTED_PLACEHOLDERS.has(match[1]));
};

export const designTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255, "Name must be 255 characters or fewer."),
  nicheCategory: z.string().min(1, "Choose a niche."),
  artStyle: z.string().min(1, "Choose an art style."),
  basePrompt: z
    .string()
    .trim()
    .min(1, "Base prompt is required.")
    .max(1000, "Base prompt must be 1,000 characters or fewer.")
    .refine(hasOnlySupportedPlaceholders, "The prompt contains an unsupported placeholder."),
  negativePrompt: z
    .string()
    .max(1000, "Negative prompt must be 1,000 characters or fewer.")
    .refine(hasOnlySupportedPlaceholders, "The prompt contains an unsupported placeholder."),
  examples: z
    .array(
      z.object({
        subject: z.string().trim().min(1, "Subject is required."),
        prompt: z.string().trim().min(1, "Example prompt is required."),
      })
    )
    .max(5, "You can add up to five examples."),
});

export type DesignTemplateFormValues = z.infer<typeof designTemplateSchema>;
