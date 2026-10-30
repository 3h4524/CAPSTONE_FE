import { describe, expect, it } from "vitest";
import type { ZodSafeParseResult } from "zod";

import {
  applyMockupConfigSchema,
  approvalGateConfigSchema,
  designApprovalConfigSchema,
  designImageConfigSchema,
  exportZipConfigSchema,
  generateListingConfigSchema,
  generateVideoConfigSchema,
  productInputConfigSchema,
  promptSynthesisConfigSchema,
  publishConfigSchema,
  workflowMetaSchema,
  workflowNodeConfigSchemas,
} from "@/schemas/workflow";
import type { WorkflowNodeType } from "@/types/workflow";

const validNodeConfigs: Record<WorkflowNodeType, Record<string, unknown>> = {
  "product-input": { batchId: "bat_1", productId: "" },
  "prompt-synthesis": { designTemplateId: "dpl_1", stylePresetId: "sty_1", instructions: "Keep it warm" },
  "design-image": { imageProvider: "gemini", variants: 2, aspectRatio: "1:1" },
  "design-approval": { mode: "manual" },
  "approval-gate": { mode: "manual" },
  "apply-mockup": {
    mockupTemplateIds: ["mkp_1", "mkp_2"],
    templateColors: {},
    templateBackgrounds: {},
    mockupIds: [],
    artworkGroupKey: "",
  },
  "generate-video": {
    mode: "standard",
    target: "etsy",
    template: "auto",
    outputFormat: "portrait",
    durationSeconds: 20,
    assetSelection: "automatic",
    selectedMockupIds: [],
    sceneOrder: [],
    textOverlay: "",
    standardOptions: { motionPreset: "varied", crop: "safe", transition: "fade" },
    fallbackToStandard: true,
    aiGlobalInstructions: null,
    aiStudioMode: "direct",
    aiStudioLayout: "hanging_window",
  },
  "review-video": {},
  "generate-listing": { model: "gpt-4o", tone: "friendly", includeSeoScore: true },
  "export-zip": {},
  "publish-etsy": { publishImmediately: false },
  "publish-printify": { publishImmediately: true },
};

// These node types declare no field of their own, so an empty config is already valid for them.
const OPTIONLESS_NODE_TYPES: WorkflowNodeType[] = ["export-zip", "review-video"];

const omitKey = <T extends object, K extends keyof T>(source: T, key: K): Omit<T, K> => {
  const { [key]: _omitted, ...rest } = source;
  return rest;
};

const issuesAt = (result: ZodSafeParseResult<unknown>) =>
  result.error?.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) ?? [];

const expectIssue = (result: ZodSafeParseResult<unknown>, path: string, message?: string) => {
  const matched = issuesAt(result).filter((issue) => issue.path === path);
  expect(result.success).toBe(false);
  expect(matched.length).toBeGreaterThan(0);
  if (message !== undefined) expect(matched.map((issue) => issue.message)).toContain(message);
};

const nodeEntries = Object.entries(validNodeConfigs) as Array<[WorkflowNodeType, Record<string, unknown>]>;

describe("workflowNodeConfigSchemas", () => {
  it("maps every one of the twelve workflow node types to a schema", () => {
    expect(Object.keys(workflowNodeConfigSchemas).sort()).toEqual(
      nodeEntries.map(([nodeType]) => nodeType).sort()
    );
    expect(Object.keys(workflowNodeConfigSchemas)).toHaveLength(12);
  });

  it("shares a single schema between the two publish node types", () => {
    expect(workflowNodeConfigSchemas["publish-etsy"]).toBe(workflowNodeConfigSchemas["publish-printify"]);
    expect(workflowNodeConfigSchemas["publish-etsy"]).toBe(publishConfigSchema);
  });

  it.each(nodeEntries)("accepts the valid $0 config", (nodeType, config) => {
    const result = workflowNodeConfigSchemas[nodeType].safeParse(config);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(config);
  });

  it.each(nodeEntries.filter(([nodeType]) => !OPTIONLESS_NODE_TYPES.includes(nodeType)))(
    "rejects an empty $0 config",
    (nodeType) => {
      const result = workflowNodeConfigSchemas[nodeType].safeParse({});

      expect(result.success).toBe(false);
      expect(issuesAt(result).length).toBeGreaterThan(0);
    }
  );

  it.each(nodeEntries)("drops keys the $0 schema does not declare", (nodeType, config) => {
    const result = workflowNodeConfigSchemas[nodeType].safeParse({ ...config, label: "Node label" });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(config);
  });
});

describe("productInputConfigSchema", () => {
  it("accepts a one-character batchId", () => {
    const result = productInputConfigSchema.safeParse({ batchId: "b", productId: "" });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ batchId: "b", productId: "" });
  });

  it("accepts a product id for the video", () => {
    const productId = "3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
    const result = productInputConfigSchema.safeParse({ batchId: "b", productId });

    expect(result.success).toBe(true);
    expect(result.success && result.data.productId).toBe(productId);
  });

  it("rejects a product id that is not a uuid", () => {
    const result = productInputConfigSchema.safeParse({ batchId: "b", productId: "product-1" });

    expectIssue(result, "productId", "Choose one product from the selected batch.");
  });

  it("rejects an empty batchId", () => {
    const result = productInputConfigSchema.safeParse({ batchId: "", productId: "" });

    expectIssue(result, "batchId", "Choose the batch that feeds this workflow.");
  });

  it("rejects a whitespace batchId because the field skips trim()", () => {
    const result = productInputConfigSchema.safeParse({ batchId: "   ", productId: "" });

    expect(result.success).toBe(true);
  });

  it("rejects a payload without batchId", () => {
    const result = productInputConfigSchema.safeParse({});

    expectIssue(result, "batchId");
  });
});

describe("promptSynthesisConfigSchema", () => {
  const valid = { designTemplateId: "dpl_1", stylePresetId: "sty_1", instructions: "Keep it warm" };

  it("accepts a fully populated config", () => {
    const result = promptSynthesisConfigSchema.safeParse(valid);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(valid);
  });

  it("accepts empty instructions", () => {
    const result = promptSynthesisConfigSchema.safeParse({ ...valid, instructions: "" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.instructions).toBe("");
  });

  it("trims the instructions", () => {
    const result = promptSynthesisConfigSchema.safeParse({ ...valid, instructions: "  Keep it warm  " });

    expect(result.success).toBe(true);
    expect(result.success && result.data.instructions).toBe("Keep it warm");
  });

  it.each(["designTemplateId", "stylePresetId", "instructions"] as const)(
    "rejects a config without %s",
    (field) => {
      const result = promptSynthesisConfigSchema.safeParse(omitKey(valid, field));

      expectIssue(result, field);
    }
  );

  it("reports the dedicated message for an empty designTemplateId", () => {
    const result = promptSynthesisConfigSchema.safeParse({ ...valid, designTemplateId: "" });

    expectIssue(result, "designTemplateId", "Choose a design template.");
  });

  it("accepts an empty stylePresetId because the art style is optional", () => {
    const result = promptSynthesisConfigSchema.safeParse({ ...valid, stylePresetId: "" });

    expect(result.success).toBe(true);
  });

  it("accepts 500 characters of instructions and rejects 501", () => {
    const atLimit = promptSynthesisConfigSchema.safeParse({ ...valid, instructions: "x".repeat(500) });
    const overLimit = promptSynthesisConfigSchema.safeParse({ ...valid, instructions: "x".repeat(501) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, "instructions", "Keep instructions under 500 characters.");
  });

  it("rejects a non-string instruction", () => {
    const result = promptSynthesisConfigSchema.safeParse({ ...valid, instructions: 42 });

    expectIssue(result, "instructions");
  });
});

describe("designImageConfigSchema", () => {
  it.each(["gemini", "ideogram"] as const)("accepts the image model %s", (imageProvider) => {
    const result = designImageConfigSchema.safeParse({ imageProvider, variants: 1, aspectRatio: "1:1" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.imageProvider).toBe(imageProvider);
  });

  it.each(["openai", "", "Gemini", undefined])("rejects %j as an image model", (imageProvider) => {
    const result = designImageConfigSchema.safeParse({ imageProvider, variants: 1, aspectRatio: "1:1" });

    expectIssue(result, "imageProvider", "Choose an image model.");
  });

  it.each(["1:1", "16:9", "9:16", "4:3", "3:4"] as const)("accepts the aspect ratio %s", (aspectRatio) => {
    const result = designImageConfigSchema.safeParse({ imageProvider: "gemini", variants: 1, aspectRatio });

    expect(result.success).toBe(true);
    expect(result.success && result.data.aspectRatio).toBe(aspectRatio);
  });

  it.each(["21:9", "", "1:1 ", 1])("rejects %j as an aspect ratio", (aspectRatio) => {
    const result = designImageConfigSchema.safeParse({ imageProvider: "gemini", variants: 1, aspectRatio });

    expectIssue(result, "aspectRatio", "Choose an aspect ratio.");
  });

  it.each([1, 2, 3, 4])("accepts a variant count of %i", (variants) => {
    const result = designImageConfigSchema.safeParse({ imageProvider: "gemini", variants, aspectRatio: "1:1" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.variants).toBe(variants);
  });

  it.each([
    { variants: 0, message: "The number of variants must be at least 1." },
    { variants: 5, message: "The number of variants cannot exceed 4." },
  ])("rejects a variant count of $variants", ({ variants, message }) => {
    const result = designImageConfigSchema.safeParse({ imageProvider: "gemini", variants, aspectRatio: "1:1" });

    expectIssue(result, "variants", message);
  });

  it("rejects a fractional variant count", () => {
    const result = designImageConfigSchema.safeParse({ imageProvider: "gemini", variants: 1.5, aspectRatio: "1:1" });

    expectIssue(result, "variants", "The number of variants must be a whole number.");
  });

  it.each([undefined, "2", null, true])("rejects %j as a variant count", (variants) => {
    const result = designImageConfigSchema.safeParse({ imageProvider: "gemini", variants, aspectRatio: "1:1" });

    expectIssue(result, "variants", "Enter the number of variants.");
  });

  it("rejects a config without variants", () => {
    const result = designImageConfigSchema.safeParse({ imageProvider: "gemini", aspectRatio: "1:1" });

    expectIssue(result, "variants", "Enter the number of variants.");
  });

  it("rejects a config without an aspect ratio", () => {
    const result = designImageConfigSchema.safeParse({ imageProvider: "gemini", variants: 2 });

    expectIssue(result, "aspectRatio", "Choose an aspect ratio.");
  });
});

describe("designApprovalConfigSchema", () => {
  it.each(["manual", "auto"] as const)("accepts the %s mode", (mode) => {
    const result = designApprovalConfigSchema.safeParse({ mode });

    expect(result.success).toBe(true);
    expect(result.success && result.data.mode).toBe(mode);
  });

  it.each(["review", "", "Manual", 1])("rejects %j as a mode", (mode) => {
    const result = designApprovalConfigSchema.safeParse({ mode });

    expectIssue(result, "mode", "Choose how designs are approved.");
  });

  it("rejects a config without mode", () => {
    const result = designApprovalConfigSchema.safeParse({});

    expectIssue(result, "mode", "Choose how designs are approved.");
  });
});

describe("approvalGateConfigSchema", () => {
  it("accepts the manual mode", () => {
    const result = approvalGateConfigSchema.safeParse({ mode: "manual" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.mode).toBe("manual");
  });

  it.each(["review", "", "Manual", "auto", 1])("rejects %j as a mode", (mode) => {
    const result = approvalGateConfigSchema.safeParse({ mode });

    expectIssue(result, "mode");
  });

  it("rejects a config without mode", () => {
    const result = approvalGateConfigSchema.safeParse({});

    expectIssue(result, "mode");
  });
});

describe("applyMockupConfigSchema", () => {
  const base = {
    mockupTemplateIds: ["mkp_1"],
    templateColors: {},
    templateBackgrounds: {},
    mockupIds: [],
    artworkGroupKey: "",
  };

  it("accepts one through five template ids", () => {
    for (const length of [1, 2, 3, 4, 5]) {
      const mockupTemplateIds = Array.from({ length }, (_, index) => `mkp_${index}`);
      const result = applyMockupConfigSchema.safeParse({ ...base, mockupTemplateIds });

      expect(result.success).toBe(true);
      expect(result.success && result.data.mockupTemplateIds).toEqual(mockupTemplateIds);
    }
  });

  it("accepts an empty template list because the mock-ups may be uploaded instead", () => {
    const result = applyMockupConfigSchema.safeParse({ ...base, mockupTemplateIds: [] });

    expect(result.success).toBe(true);
  });

  it("rejects a sixth template id", () => {
    const result = applyMockupConfigSchema.safeParse({
      ...base,
      mockupTemplateIds: ["a", "b", "c", "d", "e", "f"],
    });

    expectIssue(result, "mockupTemplateIds", "Choose up to 5 mock-up templates.");
  });

  it.each([
    { label: "a string", value: "a" },
    { label: "a number", value: 5 },
    { label: "a boolean", value: true },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
  ])("rejects $label as a template list", ({ value }) => {
    const result = applyMockupConfigSchema.safeParse({ ...base, mockupTemplateIds: value });

    expectIssue(result, "mockupTemplateIds");
  });

  it("rejects a non-string entry inside the template list", () => {
    const result = applyMockupConfigSchema.safeParse({ ...base, mockupTemplateIds: [1] });

    expectIssue(result, "mockupTemplateIds.0");
  });

  it("rejects a config without the template list", () => {
    const result = applyMockupConfigSchema.safeParse(omitKey(base, "mockupTemplateIds"));

    expectIssue(result, "mockupTemplateIds");
  });

  it("rejects a garment color that is not a hex color", () => {
    const result = applyMockupConfigSchema.safeParse({
      ...base,
      templateColors: { mkp_1: ["red"] },
    });

    expectIssue(result, "templateColors.mkp_1.0", "Garment colors must look like #RRGGBB.");
  });

  it("rejects a background color that is not a hex color", () => {
    const result = applyMockupConfigSchema.safeParse({
      ...base,
      templateBackgrounds: { mkp_1: "white" },
    });

    expectIssue(result, "templateBackgrounds.mkp_1", "Background colors must look like #RRGGBB.");
  });
});

describe("generateVideoConfigSchema", () => {
  const valid = {
    mode: "standard",
    target: "etsy",
    template: "auto",
    outputFormat: "portrait",
    durationSeconds: 20,
    assetSelection: "automatic",
    selectedMockupIds: [],
    sceneOrder: [],
    textOverlay: "",
    standardOptions: { motionPreset: "varied", crop: "safe", transition: "fade" },
    fallbackToStandard: true,
    aiGlobalInstructions: null,
    aiStudioMode: "direct",
    aiStudioLayout: "hanging_window",
  };

  it("accepts a fully populated config", () => {
    const result = generateVideoConfigSchema.safeParse(valid);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(valid);
  });

  it.each(["auto", "product_showcase", "design_detail", "variant_showcase"] as const)(
    "accepts the video template %s",
    (template) => {
      const result = generateVideoConfigSchema.safeParse({ ...valid, template });

      expect(result.success).toBe(true);
      expect(result.success && result.data.template).toBe(template);
    }
  );

  // Standard scenes no longer pick a template: the field only keeps what older workflows stored.
  it.each(["reel", "vertical_reel"])("keeps %j, a template name stored by an older workflow", (template) => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, template });

    expect(result.success).toBe(true);
    expect(result.success && result.data.template).toBe(template);
  });

  it.each(["", "   "])("rejects %j as a video template", (template) => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, template });

    expectIssue(result, "template", "Choose a video template.");
  });

  it.each([3, 15, 20, 29, 30])("accepts a duration of %i seconds", (durationSeconds) => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, durationSeconds });

    expect(result.success).toBe(true);
    expect(result.success && result.data.durationSeconds).toBe(durationSeconds);
  });

  it.each([
    { durationSeconds: 0, message: "The video duration must be at least 1." },
    { durationSeconds: 31, message: "The video duration cannot exceed 30." },
  ])("rejects a duration of $durationSeconds seconds", ({ durationSeconds, message }) => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, durationSeconds });

    expectIssue(result, "durationSeconds", message);
  });

  it("rejects a fractional duration", () => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, durationSeconds: 14.5 });

    expectIssue(result, "durationSeconds", "The video duration must be a whole number.");
  });

  it.each([undefined, "20", null])("rejects %j as a duration", (durationSeconds) => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, durationSeconds });

    expectIssue(result, "durationSeconds", "Enter the video duration.");
  });

  it("accepts the standard mode", () => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, mode: "standard" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.mode).toBe("standard");
  });

  it("accepts the ai_shot mode with its scene settings", () => {
    const result = generateVideoConfigSchema.safeParse({
      ...valid,
      mode: "ai_shot",
      durationSeconds: 15,
      aiShotOptions: {
        coverage: "full_video",
        concept: "product_cinematic",
        sceneIndex: 0,
        mockupId: null,
        prompt: null,
        rightsConfirmed: true,
        fullSceneMockupIds: null,
      },
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.mode).toBe("ai_shot");
  });

  it("requires the ai shot scene settings when the mode is ai_shot", () => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, mode: "ai_shot" });

    expectIssue(result, "aiShotOptions", "Configure at least one AI video scene.");
  });

  it.each(["auto", "", "Standard", 1])("rejects %j as a mode", (mode) => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, mode });

    expectIssue(result, "mode");
  });

  it("requires an approved mockup when the assets are picked by hand", () => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, assetSelection: "manual" });

    expectIssue(result, "selectedMockupIds", "Choose at least one approved mockup.");
  });

  it("rejects a target other than Etsy", () => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, target: "amazon" });

    expectIssue(result, "target");
  });

  it("rejects a config without the standard options", () => {
    const result = generateVideoConfigSchema.safeParse(omitKey(valid, "standardOptions"));

    expectIssue(result, "standardOptions");
  });
});

describe("generateListingConfigSchema", () => {
  const valid = { model: "gpt-4o", tone: "friendly", includeSeoScore: true };

  it("accepts a fully populated config", () => {
    const result = generateListingConfigSchema.safeParse(valid);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(valid);
  });

  it.each(["gpt-4o", "gemini"] as const)("accepts the language model %s", (model) => {
    const result = generateListingConfigSchema.safeParse({ ...valid, model });

    expect(result.success).toBe(true);
    expect(result.success && result.data.model).toBe(model);
  });

  it.each(["claude", "", "GPT-4O"])("rejects %j as a language model", (model) => {
    const result = generateListingConfigSchema.safeParse({ ...valid, model });

    expectIssue(result, "model", "Choose a language model.");
  });

  it.each(["friendly", "professional", "playful"] as const)("accepts the tone %s", (tone) => {
    const result = generateListingConfigSchema.safeParse({ ...valid, tone });

    expect(result.success).toBe(true);
    expect(result.success && result.data.tone).toBe(tone);
  });

  it.each(["formal", "", "Friendly"])("rejects %j as a tone", (tone) => {
    const result = generateListingConfigSchema.safeParse({ ...valid, tone });

    expectIssue(result, "tone", "Choose a tone.");
  });

  it.each(["includeSeoScore"] as const)("rejects a string for the boolean %s", (field) => {
    const result = generateListingConfigSchema.safeParse({ ...valid, [field]: "true" });

    expectIssue(result, field);
  });
});

describe("exportZipConfigSchema", () => {
  it("accepts an empty config", () => {
    const result = exportZipConfigSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({});
  });

  it("drops the keys it does not declare", () => {
    const result = exportZipConfigSchema.safeParse({ includeVideo: true, includeListingCsv: true });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({});
  });
});

describe("publishConfigSchema", () => {
  it("accepts publishImmediately set to true or false", () => {
    const enabled = publishConfigSchema.safeParse({ publishImmediately: true });
    const disabled = publishConfigSchema.safeParse({ publishImmediately: false });

    expect(enabled.success).toBe(true);
    expect(disabled.success).toBe(true);
  });

  it("rejects a config without publishImmediately", () => {
    const result = publishConfigSchema.safeParse({});

    expectIssue(result, "publishImmediately");
  });

  it.each(["yes", 1, null])("rejects %j for publishImmediately", (publishImmediately) => {
    const result = publishConfigSchema.safeParse({ publishImmediately });

    expectIssue(result, "publishImmediately");
  });
});

describe("workflowMetaSchema", () => {
  const valid = { name: "Summer workflow", description: "Covers the whole summer drop" };

  it("accepts a fully populated payload and returns both fields trimmed", () => {
    const result = workflowMetaSchema.safeParse({
      name: "  Summer workflow  ",
      description: "  Covers the whole summer drop  ",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(valid);
  });

  it("accepts an empty description", () => {
    const result = workflowMetaSchema.safeParse({ name: "Summer workflow", description: "" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.description).toBe("");
  });

  it.each(["name", "description"] as const)("rejects a payload without %s", (field) => {
    const result = workflowMetaSchema.safeParse(omitKey(valid, field));

    expectIssue(result, field);
  });

  it("rejects a name of only whitespace", () => {
    const result = workflowMetaSchema.safeParse({ ...valid, name: "   " });

    expectIssue(result, "name", "Give the workflow a name (at least 2 characters).");
  });

  it("accepts a two-character name", () => {
    const result = workflowMetaSchema.safeParse({ ...valid, name: "ab" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe("ab");
  });

  it("rejects a one-character name", () => {
    const result = workflowMetaSchema.safeParse({ ...valid, name: "a" });

    expectIssue(result, "name", "Give the workflow a name (at least 2 characters).");
  });

  it("accepts a 120-character name and rejects 121", () => {
    const atLimit = workflowMetaSchema.safeParse({ ...valid, name: "x".repeat(120) });
    const overLimit = workflowMetaSchema.safeParse({ ...valid, name: "x".repeat(121) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, "name", "Keep the name under 120 characters.");
  });

  it("accepts a 500-character description and rejects 501", () => {
    const atLimit = workflowMetaSchema.safeParse({ ...valid, description: "x".repeat(500) });
    const overLimit = workflowMetaSchema.safeParse({ ...valid, description: "x".repeat(501) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, "description", "Keep the description under 500 characters.");
  });

  it.each([
    { field: "name", value: 12 },
    { field: "description", value: null },
  ] as const)("rejects a $field of the wrong type", ({ field, value }) => {
    const result = workflowMetaSchema.safeParse({ ...valid, [field]: value });

    expectIssue(result, field);
  });
});
