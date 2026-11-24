import { z } from "zod";

import { i18n } from "@/i18n/client";
import type { WorkflowNodeConfig, WorkflowNodeType } from "@/types/workflow";

const AI_ADVANCED_CONTROLS_ENABLED = false;
/** The longest wording a seller may give an AI scene's template prompt (the backend's limit too). */
export const MAX_CUSTOM_VIDEO_PROMPT = 2000;

type NumberLabel = "timelineFrame" | "fadeIn" | "fadeOut" | "variants" | "videoDuration" | "sceneDuration" | "transitionDuration";

const numberLabel = (label: NumberLabel) => i18n.t(`workflowConfig.schema.numberLabels.${label}`);

const wholeNumber = (label: NumberLabel, min: number, max: number) =>
  z
    .number({ error: () => i18n.t("workflowConfig.schema.enterNumber", { label: numberLabel(label) }) })
    .int({ error: () => i18n.t("workflowConfig.schema.wholeNumber", { label: numberLabel(label) }) })
    .min(min, { error: () => i18n.t("workflowConfig.schema.numberMin", { label: numberLabel(label), min }) })
    .max(max, { error: () => i18n.t("workflowConfig.schema.numberMax", { label: numberLabel(label), max }) });

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
// The backend writes a list or setting it left out as null (a design's own settings, a run's): that is not set.
const nullAsMissing = (value: unknown) => value ?? undefined;
const MIN_VIDEO_DURATION_SECONDS = 5;
const MAX_VIDEO_DURATION_SECONDS = 15;
const MAX_VIDEO_FRAMES = MAX_VIDEO_DURATION_SECONDS * 30;
const timelineFrame = wholeNumber("timelineFrame", 0, MAX_VIDEO_FRAMES);
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
        message: i18n.t("workflowConfig.schema.textMinFrames"),
      });
    if (overlay.type === "cta" && overlay.text.length > 40)
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message: i18n.t("workflowConfig.schema.ctaMaxLength"),
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
        fadeInFrames: wholeNumber("fadeIn", 0, 150),
        fadeOutFrames: wholeNumber("fadeOut", 0, 150),
        loop: z.boolean(),
        muted: z.boolean(),
      })
      .nullable(),
    overlays: z.preprocess((overlays) => overlays ?? [], z.array(videoOverlaySchema).max(12)),
  })
  .optional();

export const productInputConfigSchema = z.object({
  batchId: z.string().min(1, { error: () => i18n.t("workflowConfig.schema.chooseBatch") }),
  // Only the video needs one product, so it may stay empty; a workflow with a video step is checked for it separately.
  productId: z.union([
    z.literal(""),
    z.string().uuid({ error: () => i18n.t("workflowConfig.schema.chooseProduct") }),
  ]),
});

export const promptSynthesisConfigSchema = z.object({
  designTemplateId: z.string().min(1, { error: () => i18n.t("workflowConfig.schema.chooseDesignTemplate") }),
  stylePresetId: z.string(),
  instructions: z.string().trim().max(500, { error: () => i18n.t("workflowConfig.schema.instructionsMax") }),
});

export const designImageConfigSchema = z.object({
  imageProvider: z.enum(["gemini", "ideogram"], { error: () => i18n.t("workflowConfig.schema.chooseImageModel") }),
  variants: wholeNumber("variants", 1, 4),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"], { error: () => i18n.t("workflowConfig.schema.chooseAspectRatio") }),
});

export const designApprovalConfigSchema = z.object({
  mode: z.enum(["manual", "auto"], { error: () => i18n.t("workflowConfig.schema.chooseDesignApproval") }),
});

export const approvalGateConfigSchema = z.object({
  mode: z.enum(["manual", "auto"], { error: () => i18n.t("workflowConfig.schema.chooseMockupApproval") }),
});

export const reviewVideoConfigSchema = z.object({
  mode: z.enum(["manual", "auto"], { error: () => i18n.t("workflowConfig.schema.chooseVideoApproval") }),
});

export const applyMockupConfigSchema = z.object({
  // May be empty: a video can also be made from uploaded mock-ups alone. A run that generates designs asks for at least one.
  mockupTemplateIds: z.array(z.string()).max(5, { error: () => i18n.t("workflowConfig.schema.mockupTemplatesMax") }),
  templateColors: z.record(
    z.string(),
    z
      .array(z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: () => i18n.t("workflowConfig.schema.garmentColorFormat") }))
      .max(5, { error: () => i18n.t("workflowConfig.schema.garmentColorsMax") })
  ),
  // Per template, a background per garment color (or "default"). A workflow saved while a template had a
  // single background holds a plain color there, which reads as its default.
  templateBackgrounds: z.record(
    z.string(),
    z.union([
      z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: () => i18n.t("workflowConfig.schema.backgroundColorFormat") }),
      z.record(
        z.string(),
        z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: () => i18n.t("workflowConfig.schema.backgroundColorFormat") })
      ),
    ])
  ),
  // Where this workflow puts the design on a template, kept here so a shared template is never changed.
  templatePlacements: z
    .record(
      z.string(),
      z.object({
        x: z.number().int().min(0),
        y: z.number().int().min(0),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        rotation: z.number().min(-180).max(180),
      })
    )
    .optional(),
  // What the mock-ups are for: export only, or a Printify product (one Printify template per type).
  // A workflow saved before the choice existed is "zip".
  mockupTarget: z.enum(["zip", "printify"]).default("zip"),
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
    template: z.string().trim().min(1, { error: () => i18n.t("workflowConfig.schema.chooseVideoTemplate") }).default("auto"),
    templateVersion: z.number().int().min(1).max(2).optional(),
    outputFormat: z
      .enum(["square", "portrait", "landscape", "classic_landscape", "classic_portrait"])
      .catch("square")
      .default("square"),
    durationSeconds: wholeNumber("videoDuration", MIN_VIDEO_DURATION_SECONDS, MAX_VIDEO_DURATION_SECONDS),
    assetSelection: z.enum(["automatic", "manual"]),
    // The backend keeps these as null when no mock-up is picked (a design's own settings, a run's): that is none.
    selectedMockupIds: z.preprocess(
      (ids) => ids ?? [],
      z
        .array(z.string().uuid())
        .max(8)
        .refine((ids) => new Set(ids).size === ids.length, { error: () => i18n.t("workflowConfig.schema.mockupOnce") })
    ),
    sceneOrder: z.preprocess(
      (ids) => ids ?? [],
      z
        .array(z.string().uuid())
        .max(4)
        .refine(
          (ids) => new Set(ids).size === ids.length,
          { error: () => i18n.t("workflowConfig.schema.sceneOrderOnce") }
        )
    ),
    standardScenes: z.preprocess(
      nullAsMissing,
      z
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
          { error: () => i18n.t("workflowConfig.schema.framingOnce") }
        )
        .optional()
    ),
    textOverlay: z.string().max(120),
    standardOptions: z.object({
      motionPreset: z.preprocess(
        normalizeLegacyStandardMotion,
        z.enum(["varied", ...standardSceneMotions.filter((motion) => motion !== "custom")])
      ),
      crop: z.literal("safe"),
      transition: videoTransitionSchema,
    }),
    sceneMotionPresets: z.preprocess(
      nullAsMissing,
      z
        .array(z.preprocess(normalizeLegacyStandardMotion, z.enum(standardSceneMotions).nullable()))
        .max(4)
        .optional()
    ),
    fallbackToStandard: z.boolean(),
    aiCharacterModelId: z.string().uuid().nullable().optional(),
    sharedMockupId: z.string().uuid().nullable().optional(),
    // The backend writes this legacy setting as null when it is not used (always, once a node has aiScenes).
    aiShotOptions: z.preprocess(
      nullAsMissing,
      z
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
        .optional()
    ),
    aiScenes: z.preprocess(
      nullAsMissing,
      z
      .array(
        z.object({
          mode: z.enum(["ai", "standard"]).default("ai"),
          aiVideoModelKey: z.enum(["minimax_h3", "minimax_h3_lite"]).nullable().optional(),
          mockupId: z.string().uuid().nullable(),
          templateCode: z.string().min(1),
          subtemplateCode: z.string().min(1).nullable().optional(),
          durationSeconds: wholeNumber("sceneDuration", 1, MAX_VIDEO_DURATION_SECONDS),
          framing: z.string().min(1),
          cameraAngle: z.string().min(1),
          cameraMovement: z.string().min(1),
          subjectMotion: z.string().min(1),
          motionIntensity: z.string().min(1),
          lighting: z.string().min(1),
          extraInstructions: AI_ADVANCED_CONTROLS_ENABLED
            ? z.string().trim().max(500, { error: () => i18n.t("workflowConfig.schema.sceneInstructionsMax") }).nullable()
            : z.unknown().optional().transform(() => null),
          rightsConfirmed: z.boolean(),
          startFrameMode: z.enum(["direct", "studio"]).nullable().optional(),
          studioLayout: z.enum(["hanging_window", "flat_lay", "none"]).nullable().optional(),
          studioFrameId: z.string().uuid().nullable().optional(),
          studioPrompt: z
            .string()
            .trim()
            .max(500, { error: () => i18n.t("workflowConfig.schema.keyframeDirectionsMax") })
            .nullable()
            .optional(),
          studioReferenceHashes: z.array(z.string().length(64)).max(3).nullable().optional(),
          // Matches AiVideoPromptCompiler.MaximumCustomPromptCharacters.
          customPrompt: z
            .string()
            .trim()
            .max(MAX_CUSTOM_VIDEO_PROMPT, { error: () => i18n.t("workflowConfig.schema.customVideoPromptMax", { max: MAX_CUSTOM_VIDEO_PROMPT }) })
            .nullable()
            .optional(),
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
          aiStartFrameCrop: z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1), width: z.number().finite().positive().max(1), height: z.number().finite().positive().max(1) }).refine(crop => crop.x + crop.width <= 1 && crop.y + crop.height <= 1, { error: () => i18n.t("workflowConfig.schema.cropInsideImage") }).nullable().optional(),
          displayDurationFrames: wholeNumber("sceneDuration", 30, MAX_VIDEO_FRAMES).nullable().optional(),
          trimStartFrames: timelineFrame.nullable().optional(),
          trimEndFrames: timelineFrame.nullable().optional(),
          transitionIn: videoTransitionSchema.nullable().optional(),
          transitionDurationFrames: wholeNumber("transitionDuration", 0, 30).nullable().optional(),
        })
      )
      .max(4)
      .optional()
    ),
    aiGlobalInstructions: AI_ADVANCED_CONTROLS_ENABLED
      ? z
          .string()
          .trim()
          .max(500, { error: () => i18n.t("workflowConfig.schema.sharedDirectionMax") })
          .nullable()
          .optional()
      : z.unknown().optional().transform(() => null),
    aiStudioMode: z.enum(["direct", "studio"]).catch("direct").default("direct"),
    aiStudioLayout: z
      .enum(["hanging_window", "flat_lay"])
      .catch("hanging_window")
      .default("hanging_window"),
    aiStudioSourceMockupId: z.string().uuid().nullable().optional(),
    aiStudioFrameId: z.string().uuid().nullable().optional(),
    videoEdit: z.preprocess(nullAsMissing, videoEditSchema),
    // Before a batch run, some products' own Generate Video settings (product id to a whole config), each checked when
    // it is edited (see `ProductScopeSelect`).
    productConfigs: z.preprocess(
      nullAsMissing,
      z.record(z.string().uuid(), z.record(z.string(), z.unknown())).optional()
    ),
  })
  .superRefine((value, ctx) => {
    if (value.assetSelection === "manual" && value.selectedMockupIds.length === 0)
      ctx.addIssue({
        code: "custom",
        path: ["selectedMockupIds"],
        message: i18n.t("workflowConfig.schema.chooseApprovedMockup"),
      });
    if (
      value.mode === "ai_shot" &&
      !["auto", "product_showcase", "design_detail", "variant_showcase", "product_on_model_pack"].includes(value.template)
    )
      ctx.addIssue({
        code: "custom",
        path: ["template"],
        message: i18n.t("workflowConfig.schema.supportedAiTemplate"),
      });
    // A new video has no scenes until the seller adds one; settings from before the scene editor (a legacy AI shot,
    // or Standard mock-ups chosen by id) still describe a video on their own.
    const hasLegacyVideo =
      Boolean(value.aiShotOptions) ||
      (value.mode === "standard" && (value.sceneOrder.length > 0 || value.selectedMockupIds.length > 0));
    if (!value.aiScenes?.length && !hasLegacyVideo) {
      ctx.addIssue({ code: "custom", path: ["aiScenes"], message: i18n.t("workflowConfig.schema.addScene") });
      return;
    }
    if (value.mode !== "ai_shot") return;
    if (value.aiScenes?.length) {
      if (value.aiScenes.length > 4)
        ctx.addIssue({ code: "custom", path: ["aiScenes"], message: i18n.t("workflowConfig.schema.scenesMax") });
      // A scene may leave its image open: the run picks each design's own (its matching mock-up, its model photo for a
      // scene with a person, else its main mock-up), so a scene list is set up once, before any mock-up exists.
      value.aiScenes.forEach((scene, index) => {
        if (scene.mode === "ai" && (scene.durationSeconds < 4 || scene.durationSeconds > 15)) {
          ctx.addIssue({
            code: "custom",
            path: ["aiScenes", index, "durationSeconds"],
            message: i18n.t("workflowConfig.schema.aiSceneDuration", { scene: index + 1 }),
          });
        }
      });
      const total = value.aiScenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
      if (total < MIN_VIDEO_DURATION_SECONDS || total > MAX_VIDEO_DURATION_SECONDS)
        ctx.addIssue({
          code: "custom",
          path: ["aiScenes"],
          message: i18n.t("workflowConfig.schema.scenesTotal"),
        });
      if (value.durationSeconds !== total)
        ctx.addIssue({
          code: "custom",
          path: ["durationSeconds"],
          message: i18n.t("workflowConfig.schema.totalFromScenes"),
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
            message: i18n.t("workflowConfig.schema.sceneMinAfterTrim"),
          });
      });
      return;
    }
    if (!value.aiShotOptions) {
      ctx.addIssue({
        code: "custom",
        path: ["aiShotOptions"],
        message: i18n.t("workflowConfig.schema.configureAiScene"),
      });
      return;
    }
    if (value.aiShotOptions.coverage === "full_video" && ![8, 15].includes(value.durationSeconds))
      ctx.addIssue({
        code: "custom",
        path: ["durationSeconds"],
        message: i18n.t("workflowConfig.schema.fullAiDuration"),
      });
    if (value.aiShotOptions.coverage === "single_scene" && value.durationSeconds < 12)
      ctx.addIssue({
        code: "custom",
        path: ["durationSeconds"],
        message: i18n.t("workflowConfig.schema.mixedDuration"),
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
    error: () => i18n.t("workflowConfig.schema.chooseApprovedMockup"),
  });

export const generateListingConfigSchema = z.object({
  model: z.enum(["gpt-4o", "gemini"], { error: () => i18n.t("workflowConfig.schema.chooseLanguageModel") }),
  tone: z.enum(["friendly", "professional", "playful"], { error: () => i18n.t("workflowConfig.schema.chooseTone") }),
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
      .number({ error: () => i18n.t("workflowConfig.schema.setProfit") })
      .min(0, { error: () => i18n.t("workflowConfig.schema.profitNegative") })
      .max(500, { error: () => i18n.t("workflowConfig.schema.profitMax") }),
    designId: z.string().nullable(),
    publishToEtsy: z.boolean(),
    addMockups: z.boolean(),
    leadPhoto: z.enum(["printify", "apcs"]).optional(),
    // "mockup": the product is read from the approved mock-ups when the step runs. Unset, a node with a product keeps it.
    source: z.enum(["mockup", "manual"]).optional(),
  })
  .superRefine((value, context) => {
    if (value.source ? value.source === "mockup" : !value.blueprintId) return;
    if (!value.blueprintId) context.addIssue({ code: "custom", path: ["blueprintId"], message: i18n.t("workflowConfig.schema.chooseProductType") });
    else if (!value.printProviderId) context.addIssue({ code: "custom", path: ["printProviderId"], message: i18n.t("workflowConfig.schema.choosePrintProvider") });
    else if (value.colors.length === 0 || value.sizes.length === 0)
      context.addIssue({ code: "custom", path: ["colors"], message: i18n.t("workflowConfig.schema.chooseColorSize") });
  });

/**
 * Push to Printify when Apply mock-up set the Printify product per product type: the node only shows it, so just its
 * own settings (the profit) are checked here.
 */
export const publishPrintifyFollowingMockupSchema = z.object({
  targetProfit: z
    .number({ error: () => i18n.t("workflowConfig.schema.setProfit") })
    .min(0, { error: () => i18n.t("workflowConfig.schema.profitNegative") })
    .max(500, { error: () => i18n.t("workflowConfig.schema.profitMax") }),
  leadPhoto: z.enum(["printify", "apcs"]).optional(),
});

/** The schema a node's settings are checked with on this canvas: Push to Printify follows Apply mock-up once it is set. */
export const nodeConfigSchemaIn = (type: WorkflowNodeType, nodes: { data: { type: WorkflowNodeType; config: WorkflowNodeConfig } }[]) =>
  type === "publish-printify" && nodes.some((node) => node.data.type === "apply-mockup" && hasPrintifyProducts(node.data.config))
    ? publishPrintifyFollowingMockupSchema
    : workflowNodeConfigSchemas[type];

const hasPrintifyProducts = (config: WorkflowNodeConfig) =>
  Boolean(config.printifyProducts && typeof config.printifyProducts === "object" && Object.keys(config.printifyProducts).length > 0);

/** Publish to Etsy: one draft listing; a physical one needs a shipping profile. */
export const publishEtsyConfigSchema = z
  .object({
    listingType: z.enum(["download", "physical"]),
    price: z.number().positive({ error: () => i18n.t("workflowConfig.schema.setPrice") }).max(50000).nullable(),
    quantity: z.number().int().min(1, { error: () => i18n.t("workflowConfig.schema.quantityMin") }).max(999, { error: () => i18n.t("workflowConfig.schema.quantityMax") }),
    taxonomyId: z.number().int().positive().nullable(),
    taxonomyPath: z.string().nullable(),
    whoMade: z.enum(["i_did", "someone_else", "collective"]),
    whenMade: z.string().min(1),
    shippingProfileId: z.number().int().positive().nullable(),
    includeVideo: z.boolean(),
    madeBy: z.enum(["me", "partner"]).nullable().optional(),
    productionPartnerIds: z.array(z.number().int().positive()).optional(),
  })
  .superRefine((value, context) => {
    if (!value.price) context.addIssue({ code: "custom", path: ["price"], message: i18n.t("workflowConfig.schema.setPrice") });
    else if (!value.taxonomyId) context.addIssue({ code: "custom", path: ["taxonomyId"], message: i18n.t("workflowConfig.schema.chooseEtsyCategory") });
    else if (value.listingType === "physical" && !value.shippingProfileId)
      context.addIssue({ code: "custom", path: ["shippingProfileId"], message: i18n.t("workflowConfig.schema.shippingProfileRequired") });
    else if (value.listingType === "physical" && !value.madeBy)
      context.addIssue({ code: "custom", path: ["madeBy"], message: i18n.t("workflowConfig.schema.whoMakesRequired") });
    else if (value.listingType === "physical" && value.madeBy === "partner" && !value.productionPartnerIds?.length)
      context.addIssue({ code: "custom", path: ["productionPartnerIds"], message: i18n.t("workflowConfig.schema.choosePartner") });
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
  "review-video": reviewVideoConfigSchema,
  "generate-listing": generateListingConfigSchema,
  "export-zip": exportZipConfigSchema,
  "publish-etsy": publishEtsyConfigSchema,
  "publish-printify": publishPrintifyConfigSchema,
};

export const workflowMetaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: () => i18n.t("workflowConfig.schema.nameMin") })
    .max(120, { error: () => i18n.t("workflowConfig.schema.nameMax") }),
  description: z.string().trim().max(500, { error: () => i18n.t("workflowConfig.schema.descriptionMax") }),
});

export type WorkflowMetaFormValues = z.infer<typeof workflowMetaSchema>;
