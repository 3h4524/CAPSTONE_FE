import { z } from "zod";

import type { WorkflowNodeConfig, WorkflowNodeType } from "@/types/workflow";

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .number({ error: `Enter the ${label}.` })
    .int(`The ${label} must be a whole number.`)
    .min(min, `The ${label} must be at least ${min}.`)
    .max(max, `The ${label} cannot exceed ${max}.`);

export const productInputConfigSchema = z.object({
  batchId: z.string().min(1, "Choose the batch that feeds this workflow."),
});

export const promptSynthesisConfigSchema = z.object({
  designTemplateId: z.string().min(1, "Choose a design template."),
  stylePresetId: z.string(),
  instructions: z.string().trim().max(500, "Keep instructions under 500 characters."),
});

export const designImageConfigSchema = z.object({
  variants: wholeNumber("number of variants", 1, 4),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"], { error: "Choose an aspect ratio." }),
});

export const approvalGateConfigSchema = z.object({
  mode: z.enum(["manual", "auto"], { error: "Choose how designs are approved." }),
});

export const applyMockupConfigSchema = z.object({
  mockupTemplateIds: z
    .array(z.string())
    .min(1, "Choose at least one mock-up template.")
    .max(5, "Choose up to 5 mock-up templates."),
  templateColors: z.record(
    z.string(),
    z
      .array(z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Garment colors must look like #RRGGBB."))
      .max(5, "Choose up to 5 garment colors per template.")
  ),
});

export const generateVideoConfigSchema = z.object({
  template: z.enum(["slideshow", "showcase", "lifestyle-reel", "vertical-story"], {
    error: "Choose a video template.",
  }),
  durationSeconds: wholeNumber("video duration", 15, 30),
  withMusic: z.boolean(),
});

export const generateListingConfigSchema = z.object({
  model: z.enum(["gpt-4o", "gemini"], { error: "Choose a language model." }),
  tone: z.enum(["friendly", "professional", "playful"], { error: "Choose a tone." }),
  includeSeoScore: z.boolean(),
});

export const exportZipConfigSchema = z.object({
  includeVideo: z.boolean(),
  includeListingCsv: z.boolean(),
});

export const publishConfigSchema = z.object({
  publishImmediately: z.boolean(),
});

export const workflowNodeConfigSchemas: Record<
  WorkflowNodeType,
  z.ZodType<WorkflowNodeConfig, WorkflowNodeConfig>
> = {
  "product-input": productInputConfigSchema,
  "prompt-synthesis": promptSynthesisConfigSchema,
  "design-image": designImageConfigSchema,
  "approval-gate": approvalGateConfigSchema,
  "apply-mockup": applyMockupConfigSchema,
  "generate-video": generateVideoConfigSchema,
  "generate-listing": generateListingConfigSchema,
  "export-zip": exportZipConfigSchema,
  "publish-etsy": publishConfigSchema,
  "publish-printify": publishConfigSchema,
};

export const workflowMetaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give the workflow a name (at least 2 characters).")
    .max(120, "Keep the name under 120 characters."),
  description: z.string().trim().max(500, "Keep the description under 500 characters."),
});

export type WorkflowMetaFormValues = z.infer<typeof workflowMetaSchema>;
