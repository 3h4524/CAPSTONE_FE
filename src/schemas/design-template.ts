import { z } from "zod";

import { i18n } from "@/i18n/client";

const SUPPORTED_PLACEHOLDERS = new Set(["subject", "niche", "style", "keywords"]);

const hasOnlySupportedPlaceholders = (value: string) => {
  const placeholders = value.matchAll(/\{([^{}]+)\}/g);
  return Array.from(placeholders).every((match) => SUPPORTED_PLACEHOLDERS.has(match[1]));
};

export const designTemplateSchema = z.object({
  name: z.string().trim().min(1, { error: () => i18n.t("designTemplates.validation.nameRequired") }).max(255, { error: () => i18n.t("designTemplates.validation.nameTooLong") }),
  nicheCategory: z.string().min(1, { error: () => i18n.t("designTemplates.validation.nicheRequired") }),
  artStyle: z.string().min(1, { error: () => i18n.t("designTemplates.validation.artStyleRequired") }),
  basePrompt: z
    .string()
    .trim()
    .min(1, { error: () => i18n.t("designTemplates.validation.basePromptRequired") })
    .max(1000, { error: () => i18n.t("designTemplates.validation.basePromptTooLong") })
    .refine(hasOnlySupportedPlaceholders, { error: () => i18n.t("designTemplates.validation.unsupportedPlaceholder") }),
  negativePrompt: z
    .string()
    .max(1000, { error: () => i18n.t("designTemplates.validation.negativePromptTooLong") })
    .refine(hasOnlySupportedPlaceholders, { error: () => i18n.t("designTemplates.validation.unsupportedPlaceholder") }),
  examples: z
    .array(
      z.object({
        subject: z.string().trim().min(1, { error: () => i18n.t("designTemplates.validation.subjectRequired") }),
        prompt: z.string().trim().min(1, { error: () => i18n.t("designTemplates.validation.examplePromptRequired") }),
      })
    )
    .max(5, { error: () => i18n.t("designTemplates.validation.tooManyExamples") }),
});

export type DesignTemplateFormValues = z.infer<typeof designTemplateSchema>;
