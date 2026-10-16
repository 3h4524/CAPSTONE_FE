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
  // Per template, a background per garment color (or "default"). A workflow saved while a template had a
  // single background holds a plain color there, which reads as its default.
  templateBackgrounds: z.record(
    z.string(),
    z.union([
      z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Background colors must look like #RRGGBB."),
      z.record(z.string(), z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Background colors must look like #RRGGBB.")),
    ])
  ),
  mockupIds: z.array(z.string().uuid()).max(8),
  artworkGroupKey: z.string().max(100),
});

export const generateVideoConfigSchema = z.object({
  mode: z.enum(["standard", "ai_shot"]),
  target: z.literal("etsy"),
  template: z.enum(["auto", "product_showcase", "design_detail", "variant_showcase"], {
    error: "Choose a video template.",
  }),
  templateVersion: z.number().int().min(1).max(2).optional(),
  outputFormat: z.enum(["square", "portrait", "landscape"]).catch("portrait").default("portrait"),
  durationSeconds: wholeNumber("video duration", 3, 30),
  assetSelection: z.enum(["automatic", "manual"]),
  selectedMockupIds: z.array(z.string().uuid()).max(8).refine(ids => new Set(ids).size === ids.length, "Select each mockup once."),
  sceneOrder: z.array(z.string().uuid()).max(4).refine(ids => new Set(ids).size === ids.length, "Use each mockup once in the scene order."),
  textOverlay: z.string().max(120),
  standardOptions: z.object({ motionPreset: z.enum(["varied", "gentle", "contain_gentle", "static", "pan", "zoom", "zoom_out", "pan_left", "pan_up", "pan_down", "diagonal_up_right", "diagonal_up_left", "diagonal_down_right", "diagonal_down_left"]), crop: z.literal("safe"), transition: z.enum(["fade", "cut"]) }),
  sceneMotionPresets: z.array(z.enum(["gentle", "contain_gentle", "static", "pan", "zoom", "zoom_out", "pan_left", "pan_up", "pan_down", "diagonal_up_right", "diagonal_up_left", "diagonal_down_right", "diagonal_down_left"]).nullable()).max(4).optional(),
  fallbackToStandard: z.boolean(),
  aiShotOptions: z.object({
    coverage: z.enum(["single_scene", "full_video"]),
    concept: z.enum(["product_cinematic", "material_detail", "lifestyle_motion", "product_in_use"]),
    sceneIndex: z.number().int().min(0).max(3),
    mockupId: z.string().uuid().nullable(),
    prompt: z.string().trim().max(300).nullable(),
    rightsConfirmed: z.boolean(),
    fullSceneMockupIds: z.array(z.string().uuid()).max(2).nullable(),
  }).optional(),
  aiScenes: z.array(z.object({
    mode: z.enum(["ai"]).default("ai"),
    mockupId: z.string().uuid().nullable(),
    templateCode: z.string().min(1),
    durationSeconds: z.union([z.literal(4), z.literal(6), z.literal(8)]),
    framing: z.string().min(1),
    cameraAngle: z.string().min(1),
    cameraMovement: z.string().min(1),
    subjectMotion: z.string().min(1),
    motionIntensity: z.string().min(1),
    lighting: z.string().min(1),
    extraInstructions: z.string().trim().max(500, "Keep scene instructions under 500 characters.").nullable(),
    rightsConfirmed: z.boolean(),
    startFrameMode: z.enum(["direct", "studio"]).nullable().optional(),
    studioLayout: z.enum(["hanging_window", "flat_lay", "none"]).nullable().optional(),
    studioFrameId: z.string().uuid().nullable().optional(),
    studioPrompt: z.string().trim().max(500, "Keep keyframe directions under 500 characters.").nullable().optional(),
    studioReferenceMockupIds: z.array(z.string().uuid()).max(3).nullable().optional(),
  })).max(4).optional(),
  aiGlobalInstructions: z.string().trim().max(500, "Keep shared AI scene direction under 500 characters.").nullable().optional(),
  aiStudioMode: z.enum(["direct", "studio"]).catch("direct").default("direct"),
  aiStudioLayout: z.enum(["hanging_window", "flat_lay"]).catch("hanging_window").default("hanging_window"),
  aiStudioSourceMockupId: z.string().uuid().nullable().optional(),
  aiStudioFrameId: z.string().uuid().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.assetSelection === "manual" && value.selectedMockupIds.length === 0) ctx.addIssue({ code: "custom", path: ["selectedMockupIds"], message: "Choose at least one approved mockup." });
  if (value.mode !== "ai_shot") return;
  if (value.aiScenes?.length) {
    if (value.aiScenes.length > 4) ctx.addIssue({ code: "custom", path: ["aiScenes"], message: "Use up to four AI scenes." });
    const total = value.aiScenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
    if (total > 30) ctx.addIssue({ code: "custom", path: ["aiScenes"], message: "AI video scenes can total up to 30 seconds." });
    if (value.durationSeconds !== total) ctx.addIssue({ code: "custom", path: ["durationSeconds"], message: "Total duration is calculated from the scene durations." });
    if (value.aiScenes.some(scene => ["lifestyle_in_use", "creator_pov_ugc", "everyday_story_moment"].includes(scene.templateCode) && !scene.rightsConfirmed)) {
      ctx.addIssue({ code: "custom", path: ["aiScenes"], message: "Confirm image rights for every scene featuring a person." });
    }
    return;
  }
  if (!value.aiShotOptions) { ctx.addIssue({ code: "custom", path: ["aiShotOptions"], message: "Configure at least one AI video scene." }); return; }
  if (value.aiShotOptions.coverage === "full_video" && ![8, 15].includes(value.durationSeconds)) ctx.addIssue({ code: "custom", path: ["durationSeconds"], message: "Full AI video must be 8 or 15 seconds." });
  if (value.aiShotOptions.coverage === "single_scene" && value.durationSeconds < 12) ctx.addIssue({ code: "custom", path: ["durationSeconds"], message: "Mixed AI and Standard video needs 12–15 seconds." });
  if (["lifestyle_motion", "product_in_use"].includes(value.aiShotOptions.concept) && !value.aiShotOptions.rightsConfirmed) ctx.addIssue({ code: "custom", path: ["aiShotOptions", "rightsConfirmed"], message: "Confirm image rights for the visible adult person." });
});

export const videoAssetSelectionSchema = z.object({
  assetSelection: z.enum(["automatic", "manual"]),
  selectedMockupIds: z.array(z.string().uuid()).max(8),
  sceneOrder: z.array(z.string().uuid()).max(4),
  sceneMotionPresets: z.array(z.enum(["gentle", "contain_gentle", "static", "pan", "zoom", "zoom_out", "pan_left", "pan_up", "pan_down", "diagonal_up_right", "diagonal_up_left", "diagonal_down_right", "diagonal_down_left"]).nullable()).max(4).optional(),
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
