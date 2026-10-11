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
  // Only the video needs one product, so it may stay empty; a workflow with a video step is checked for it separately.
  productId: z.union([z.literal(""), z.string().uuid("Choose one product from the selected batch.")]),
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

export const designApprovalConfigSchema = z.object({
  mode: z.enum(["manual", "auto"], { error: "Choose how designs are approved." }),
});

export const approvalGateConfigSchema = z.object({
  mode: z.literal("manual"),
});

export const applyMockupConfigSchema = z.object({
  // May be empty: a video can also be made from uploaded mock-ups alone. A run that generates designs asks for at least one.
  mockupTemplateIds: z.array(z.string()).max(5, "Choose up to 5 mock-up templates."),
  templateColors: z.record(
    z.string(),
    z
      .array(z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Garment colors must look like #RRGGBB."))
      .max(5, "Choose up to 5 garment colors per template.")
  ),
  mockupIds: z.array(z.string().uuid()).max(8),
  artworkGroupKey: z.string().max(100),
});

export const generateVideoConfigSchema = z.object({
  mode: z.enum(["standard", "ai_background", "ai_shot"]),
  target: z.literal("etsy"),
  template: z.enum(["auto", "product_showcase", "design_detail", "variant_showcase"], {
    error: "Choose a video template.",
  }),
  templateVersion: z.number().int().min(1).max(2).optional(),
  outputFormat: z.enum(["square", "portrait", "tall", "landscape"]).default("tall"),
  durationSeconds: wholeNumber("video duration", 3, 15),
  assetSelection: z.enum(["automatic", "manual"]),
  selectedMockupIds: z.array(z.string().uuid()).max(8).refine(ids => new Set(ids).size === ids.length, "Select each mockup once."),
  sceneOrder: z.array(z.string().uuid()).max(4).refine(ids => new Set(ids).size === ids.length, "Use each mockup once in the scene order."),
  textOverlay: z.string().max(120),
  standardOptions: z.object({ motionPreset: z.enum(["varied", "gentle", "contain_gentle", "static", "pan", "zoom", "zoom_out", "pan_left", "pan_up", "pan_down", "diagonal_up_right", "diagonal_up_left", "diagonal_down_right", "diagonal_down_left"]), crop: z.literal("safe"), transition: z.enum(["fade", "cut"]) }),
  sceneMotionPresets: z.array(z.enum(["gentle", "contain_gentle", "static", "pan", "zoom", "zoom_out", "pan_left", "pan_up", "pan_down", "diagonal_up_right", "diagonal_up_left", "diagonal_down_right", "diagonal_down_left"]).nullable()).max(4).optional(),
  fallbackToStandard: z.boolean(),
}).refine(value => value.assetSelection !== "manual" || value.selectedMockupIds.length > 0, { path: ["selectedMockupIds"], message: "Choose at least one approved mockup." });

export const videoAssetSelectionSchema = z.object({
  assetSelection: generateVideoConfigSchema.shape.assetSelection,
  selectedMockupIds: generateVideoConfigSchema.shape.selectedMockupIds,
  sceneOrder: generateVideoConfigSchema.shape.sceneOrder,
  sceneMotionPresets: generateVideoConfigSchema.shape.sceneMotionPresets,
}).refine(value => value.assetSelection !== "manual" || value.selectedMockupIds.length > 0, { path: ["selectedMockupIds"], message: "Choose at least one approved mockup." });

export const generateListingConfigSchema = z.object({
  model: z.enum(["gpt-4o", "gemini"], { error: "Choose a language model." }),
  tone: z.enum(["friendly", "professional", "playful"], { error: "Choose a tone." }),
  includeSeoScore: z.boolean(),
});

export const exportZipConfigSchema = z.object({});

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
  "design-approval": designApprovalConfigSchema,
  "apply-mockup": applyMockupConfigSchema,
  "approval-gate": approvalGateConfigSchema,
  "generate-video": generateVideoConfigSchema,
  "review-video": z.object({}),
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
