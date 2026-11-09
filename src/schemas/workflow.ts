import { z } from "zod";

import type { WorkflowNodeConfig, WorkflowNodeType } from "@/types/workflow";

const AI_ADVANCED_CONTROLS_ENABLED = false;

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .number({ error: `Enter the ${label}.` })
    .int(`The ${label} must be a whole number.`)
    .min(min, `The ${label} must be at least ${min}.`)
    .max(max, `The ${label} cannot exceed ${max}.`);

const videoRegionSchema = z.object({
  x: z.number().min(-1).max(1),
  y: z.number().min(-1).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
});

const videoTransitionSchema = z.enum([
  "none",
  "fade",
  "swipe",
  "zoom",
  "flash",
  "whip_pan",
  "blur",
  "cut",
]);
const standardSceneMotions = [
  "gentle",
  "contain_gentle",
  "static",
  "pan",
  "zoom",
  "zoom_out",
  "pan_left",
  "pan_up",
  "pan_down",
  "diagonal_up_right",
  "diagonal_up_left",
  "diagonal_down_right",
  "diagonal_down_left",
  "rotate_cw",
  "rotate_ccw",
  "rotate_zoom_cw",
  "rotate_zoom_ccw",
  "custom",
] as const;
type StandardSceneMotion = (typeof standardSceneMotions)[number];
const legacyAiCameraMotionAliases: Record<string, StandardSceneMotion> = {
  locked: "static",
  push_in: "zoom",
  pull_back: "zoom_out",
  pan_right: "pan",
  orbit_left: "contain_gentle",
  orbit_right: "contain_gentle",
  gentle_tracking: "contain_gentle",
  subtle_handheld: "contain_gentle",
};
const normalizeLegacyStandardMotion = (value: unknown) =>
  typeof value === "string" ? (legacyAiCameraMotionAliases[value] ?? value) : value;
const MIN_VIDEO_DURATION_SECONDS = 5;
const MAX_VIDEO_DURATION_SECONDS = 15;
const MAX_VIDEO_FRAMES = MAX_VIDEO_DURATION_SECONDS * 30;
const timelineFrame = wholeNumber("timeline frame", 0, MAX_VIDEO_FRAMES);
const videoOverlaySchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["headline", "cta"]),
    text: z.string().trim().min(1).max(120),
    startFrame: timelineFrame,
    endFrame: timelineFrame,
    x: z.number().finite().min(-1).max(2),
    y: z.number().finite().min(-1).max(2),
    align: z.enum(["left", "center", "right"]),
    preset: z.enum(["clean", "bold", "minimal", "solid", "pill", "outline"]),
    fontScale: z.number().finite().min(0.02).max(0.2),
    textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })
  .superRefine((overlay, ctx) => {
    if (overlay.endFrame - overlay.startFrame < 15)
      ctx.addIssue({
        code: "custom",
        path: ["endFrame"],
        message: "Text must remain visible for at least 15 frames.",
      });
    if (overlay.type === "cta" && overlay.text.length > 40)
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message: "CTA text must be 40 characters or less.",
      });
  });

const videoEditSchema = z
  .object({
    version: z.literal(1),
    music: z
      .object({
        trackId: z.string().uuid(),
        startFrame: timelineFrame,
        sourceOffsetFrames: timelineFrame,
        volume: z.number().finite().min(0).max(1),
        fadeInFrames: wholeNumber("fade in", 0, 150),
        fadeOutFrames: wholeNumber("fade out", 0, 150),
        loop: z.boolean(),
        muted: z.boolean(),
      })
      .nullable(),
    overlays: z.array(videoOverlaySchema).max(12),
  })
  .optional();

export const productInputConfigSchema = z.object({
  batchId: z.string().min(1, "Choose the batch that feeds this workflow."),
  // Only the video needs one product, so it may stay empty; a workflow with a video step is checked for it separately.
  productId: z.union([
    z.literal(""),
    z.string().uuid("Choose one product from the selected batch."),
  ]),
});

export const promptSynthesisConfigSchema = z.object({
  designTemplateId: z.string().min(1, "Choose a design template."),
  stylePresetId: z.string(),
  instructions: z.string().trim().max(500, "Keep instructions under 500 characters."),
});

export const designImageConfigSchema = z.object({
  imageProvider: z.enum(["gemini", "ideogram"], { error: "Choose an image model." }),
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
      z.record(
        z.string(),
        z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Background colors must look like #RRGGBB.")
      ),
    ])
  ),
  mockupIds: z.array(z.string().uuid()).max(8),
  artworkGroupKey: z.string().max(100),
});

export const generateVideoConfigSchema = z
  .object({
    mode: z.enum(["standard", "ai_shot"]),
    aiVideoModelKey: z.enum(["minimax_h3", "minimax_h3_lite"]).nullable().optional(),
    target: z.literal("etsy"),
    // Standard scenes use the selected image and camera movement directly. This
    // legacy field remains for stored workflow compatibility and AI fallback only.
    template: z.string().trim().min(1, "Choose a video template.").default("auto"),
    templateVersion: z.number().int().min(1).max(2).optional(),
    outputFormat: z.enum(["square", "portrait", "landscape"]).catch("portrait").default("portrait"),
    durationSeconds: wholeNumber("video duration", MIN_VIDEO_DURATION_SECONDS, MAX_VIDEO_DURATION_SECONDS),
    assetSelection: z.enum(["automatic", "manual"]),
    selectedMockupIds: z
      .array(z.string().uuid())
      .max(8)
      .refine((ids) => new Set(ids).size === ids.length, "Select each mockup once."),
    sceneOrder: z
      .array(z.string().uuid())
      .max(4)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Use each mockup once in the scene order."
      ),
    standardScenes: z
      .array(
        z.object({
          mockupId: z.string().uuid(),
          baseCrop: videoRegionSchema.nullable().optional(),
          startCrop: videoRegionSchema.nullable().optional(),
          endCrop: videoRegionSchema.nullable().optional(),
        })
      )
      .max(4)
      .refine(
        (scenes) => new Set(scenes.map((scene) => scene.mockupId)).size === scenes.length,
        "Configure each mockup's framing once."
      )
      .optional(),
    textOverlay: z.string().max(120),
    standardOptions: z.object({
      motionPreset: z.preprocess(
        normalizeLegacyStandardMotion,
        z.enum(["varied", ...standardSceneMotions.filter((motion) => motion !== "custom")])
      ),
      crop: z.literal("safe"),
      transition: videoTransitionSchema,
    }),
    sceneMotionPresets: z
      .array(z.preprocess(normalizeLegacyStandardMotion, z.enum(standardSceneMotions).nullable()))
      .max(4)
      .optional(),
    fallbackToStandard: z.boolean(),
    aiCharacterModelId: z.string().uuid().nullable().optional(),
    sharedMockupId: z.string().uuid().nullable().optional(),
    aiShotOptions: z
      .object({
        coverage: z.enum(["single_scene", "full_video"]),
        concept: z.enum([
          "product_cinematic",
          "material_detail",
          "lifestyle_motion",
          "product_in_use",
        ]),
        sceneIndex: z.number().int().min(0).max(3),
        mockupId: z.string().uuid().nullable(),
        prompt: z.string().trim().max(300).nullable(),
        rightsConfirmed: z.boolean(),
        fullSceneMockupIds: z.array(z.string().uuid()).max(2).nullable(),
      })
      .optional(),
    aiScenes: z
      .array(
        z.object({
          mode: z.enum(["ai", "standard"]).default("ai"),
          aiVideoModelKey: z.enum(["minimax_h3", "minimax_h3_lite"]).nullable().optional(),
          mockupId: z.string().uuid().nullable(),
          templateCode: z.string().min(1),
          subtemplateCode: z.string().min(1).nullable().optional(),
          durationSeconds: wholeNumber("scene duration", 1, MAX_VIDEO_DURATION_SECONDS),
          framing: z.string().min(1),
          cameraAngle: z.string().min(1),
          cameraMovement: z.string().min(1),
          subjectMotion: z.string().min(1),
          motionIntensity: z.string().min(1),
          lighting: z.string().min(1),
          extraInstructions: AI_ADVANCED_CONTROLS_ENABLED
            ? z.string().trim().max(500, "Keep scene instructions under 500 characters.").nullable()
            : z.unknown().transform(() => null),
          rightsConfirmed: z.boolean(),
          startFrameMode: z.enum(["direct", "studio"]).nullable().optional(),
          studioLayout: z.enum(["hanging_window", "flat_lay", "none"]).nullable().optional(),
          studioFrameId: z.string().uuid().nullable().optional(),
          studioPrompt: z
            .string()
            .trim()
            .max(500, "Keep keyframe directions under 500 characters.")
            .nullable()
            .optional(),
          studioReferenceHashes: z.array(z.string().length(64)).max(3).nullable().optional(),
          standardMotionPreset: z.preprocess(
            normalizeLegacyStandardMotion,
            z.enum(standardSceneMotions).nullable().optional()
          ),
          standardBaseCrop: videoRegionSchema.nullable().optional(),
          standardStartCrop: videoRegionSchema.nullable().optional(),
          standardEndCrop: videoRegionSchema.nullable().optional(),
          standardStartScale: z.number().finite().min(0.01).max(5).nullable().optional(),
          standardEndScale: z.number().finite().min(0.01).max(5).nullable().optional(),
          standardStartRotation: z.number().finite().min(-9999).max(9999).nullable().optional(),
          standardEndRotation: z.number().finite().min(-9999).max(9999).nullable().optional(),
          aiCropPosition: z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1) }).nullable().optional(),
          aiStartFrameCrop: z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1), width: z.number().finite().positive().max(1), height: z.number().finite().positive().max(1) }).refine(crop => crop.x + crop.width <= 1 && crop.y + crop.height <= 1, "The start frame crop must stay inside the image.").nullable().optional(),
          displayDurationFrames: wholeNumber("scene duration", 30, MAX_VIDEO_FRAMES).nullable().optional(),
          trimStartFrames: timelineFrame.nullable().optional(),
          trimEndFrames: timelineFrame.nullable().optional(),
          transitionIn: videoTransitionSchema.nullable().optional(),
          transitionDurationFrames: wholeNumber("transition duration", 0, 30).nullable().optional(),
        })
      )
      .max(4)
      .optional(),
    aiGlobalInstructions: AI_ADVANCED_CONTROLS_ENABLED
      ? z
          .string()
          .trim()
          .max(500, "Keep shared AI scene direction under 500 characters.")
          .nullable()
          .optional()
      : z.unknown().transform(() => null),
    aiStudioMode: z.enum(["direct", "studio"]).catch("direct").default("direct"),
    aiStudioLayout: z
      .enum(["hanging_window", "flat_lay"])
      .catch("hanging_window")
      .default("hanging_window"),
    aiStudioSourceMockupId: z.string().uuid().nullable().optional(),
    aiStudioFrameId: z.string().uuid().nullable().optional(),
    videoEdit: videoEditSchema,
  })
  .superRefine((value, ctx) => {
    if (value.assetSelection === "manual" && value.selectedMockupIds.length === 0)
      ctx.addIssue({
        code: "custom",
        path: ["selectedMockupIds"],
        message: "Choose at least one approved mockup.",
      });
    if (
      value.mode === "ai_shot" &&
      !["auto", "product_showcase", "design_detail", "variant_showcase", "product_on_model_pack"].includes(value.template)
    )
      ctx.addIssue({
        code: "custom",
        path: ["template"],
        message: "Choose a supported AI video template.",
      });
    if (value.mode !== "ai_shot") return;
    if (value.aiScenes?.length) {
      if (value.aiScenes.length > 4)
        ctx.addIssue({ code: "custom", path: ["aiScenes"], message: "Use up to four scenes." });
      value.aiScenes.forEach((scene, index) => {
        if (!scene.mockupId)
          ctx.addIssue({
            code: "custom",
            path: ["aiScenes", index, "mockupId"],
            message: `Choose an approved image for scene ${index + 1}.`,
          });
        if (scene.mode === "ai" && (scene.durationSeconds < 4 || scene.durationSeconds > 15)) {
          ctx.addIssue({
            code: "custom",
            path: ["aiScenes", index, "durationSeconds"],
            message: `AI scene ${index + 1} must be between 4 and 15 seconds.`,
          });
        }
      });
      const total = value.aiScenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
      if (total < MIN_VIDEO_DURATION_SECONDS || total > MAX_VIDEO_DURATION_SECONDS)
        ctx.addIssue({
          code: "custom",
          path: ["aiScenes"],
          message: "Scenes must total between 5 and 15 seconds.",
        });
      if (value.durationSeconds !== total)
        ctx.addIssue({
          code: "custom",
          path: ["durationSeconds"],
          message: "Total duration is calculated from the scene durations.",
        });
      value.aiScenes.forEach((scene, index) => {
        const sourceDuration =
          scene.mode === "standard"
            ? (scene.displayDurationFrames ?? scene.durationSeconds * 30)
            : scene.durationSeconds * 30;
        const duration = sourceDuration - (scene.trimStartFrames ?? 0) - (scene.trimEndFrames ?? 0);
        if (duration < 30)
          ctx.addIssue({
            code: "custom",
            path: ["aiScenes", index],
            message: "Each scene must remain at least one second after trimming.",
          });
      });
      return;
    }
    if (!value.aiShotOptions) {
      ctx.addIssue({
        code: "custom",
        path: ["aiShotOptions"],
        message: "Configure at least one AI video scene.",
      });
      return;
    }
    if (value.aiShotOptions.coverage === "full_video" && ![8, 15].includes(value.durationSeconds))
      ctx.addIssue({
        code: "custom",
        path: ["durationSeconds"],
        message: "Full AI video must be 8 or 15 seconds.",
      });
    if (value.aiShotOptions.coverage === "single_scene" && value.durationSeconds < 12)
      ctx.addIssue({
        code: "custom",
        path: ["durationSeconds"],
        message: "Mixed AI and Standard video needs 12–15 seconds.",
      });
  });

export const videoAssetSelectionSchema = z
  .object({
    assetSelection: z.enum(["automatic", "manual"]),
    selectedMockupIds: z.array(z.string().uuid()).max(8),
    sceneOrder: z.array(z.string().uuid()).max(4),
    sceneMotionPresets: z
      .array(
        z
          .enum([
            "gentle",
            "contain_gentle",
            "static",
            "pan",
            "zoom",
            "zoom_out",
            "pan_left",
            "pan_up",
            "pan_down",
            "diagonal_up_right",
            "diagonal_up_left",
            "diagonal_down_right",
            "diagonal_down_left",
            "rotate_cw",
            "rotate_ccw",
            "rotate_zoom_cw",
            "rotate_zoom_ccw",
            "custom",
          ])
          .nullable()
      )
      .max(4)
      .optional(),
  })
  .refine((value) => value.assetSelection !== "manual" || value.selectedMockupIds.length > 0, {
    path: ["selectedMockupIds"],
    message: "Choose at least one approved mockup.",
  });

export const generateListingConfigSchema = z.object({
  model: z.enum(["gpt-4o", "gemini"], { error: "Choose a language model." }),
  tone: z.enum(["friendly", "professional", "playful"], { error: "Choose a tone." }),
  includeSeoScore: z.boolean(),
});

export const exportZipConfigSchema = z.object({});

/** Push to Printify: the catalog choices, and the profit each sale should leave after Printify's cost and Etsy's fees. */
export const publishPrintifyConfigSchema = z
  .object({
    blueprintId: z.number().int().positive().nullable(),
    blueprintTitle: z.string().nullable(),
    printProviderId: z.number().int().positive().nullable(),
    printProviderTitle: z.string().nullable(),
    colors: z.array(z.string()),
    sizes: z.array(z.string()),
    targetProfit: z
      .number({ error: "Set the profit per item." })
      .min(0, "The profit cannot be negative.")
      .max(500, "Keep the profit per item at $500 or less."),
    designId: z.string().nullable(),
    publishToEtsy: z.boolean(),
    addMockups: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!value.blueprintId) context.addIssue({ code: "custom", path: ["blueprintId"], message: "Choose a product type." });
    else if (!value.printProviderId) context.addIssue({ code: "custom", path: ["printProviderId"], message: "Choose a print provider." });
    else if (value.colors.length === 0 || value.sizes.length === 0)
      context.addIssue({ code: "custom", path: ["colors"], message: "Choose at least one color and one size." });
  });

/** Publish to Etsy: one draft listing; a physical one needs a shipping profile. */
export const publishEtsyConfigSchema = z
  .object({
    listingType: z.enum(["download", "physical"]),
    price: z.number().positive("Set a price.").max(50000).nullable(),
    quantity: z.number().int().min(1, "Quantity is at least 1.").max(999, "Quantity is at most 999."),
    taxonomyId: z.number().int().positive().nullable(),
    taxonomyPath: z.string().nullable(),
    whoMade: z.enum(["i_did", "someone_else", "collective"]),
    whenMade: z.string().min(1),
    shippingProfileId: z.number().int().positive().nullable(),
    includeVideo: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!value.price) context.addIssue({ code: "custom", path: ["price"], message: "Set a price." });
    else if (!value.taxonomyId) context.addIssue({ code: "custom", path: ["taxonomyId"], message: "Choose an Etsy category." });
    else if (value.listingType === "physical" && !value.shippingProfileId)
      context.addIssue({ code: "custom", path: ["shippingProfileId"], message: "A physical listing needs a shipping profile." });
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
  "publish-etsy": publishEtsyConfigSchema,
  "publish-printify": publishPrintifyConfigSchema,
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
