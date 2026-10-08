import { describe, expect, it } from "vitest";
import type { ZodSafeParseResult } from "zod";

import {
  applyMockupConfigSchema,
  approvalGateConfigSchema,
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
  "product-input": { batchId: "bat_1" },
  "prompt-synthesis": { designTemplateId: "dpl_1", stylePresetId: "sty_1", instructions: "Keep it warm" },
  "design-image": { model: "sdxl", variants: 2 },
  "approval-gate": { mode: "manual" },
  "apply-mockup": { mockupTemplateIds: ["mkp_1", "mkp_2"] },
  "generate-video": { template: "slideshow", durationSeconds: 20, withMusic: true },
  "generate-listing": { model: "gpt-4o", tone: "friendly", includeSeoScore: true },
  "export-zip": { includeVideo: true, includeListingCsv: false },
  "publish-etsy": { publishImmediately: false },
  "publish-printify": { publishImmediately: true },
};

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
  it("maps every one of the ten workflow node types to a schema", () => {
    expect(Object.keys(workflowNodeConfigSchemas).sort()).toEqual(
      nodeEntries.map(([nodeType]) => nodeType).sort()
    );
    expect(Object.keys(workflowNodeConfigSchemas)).toHaveLength(10);
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

  it.each(nodeEntries)("rejects an empty $0 config", (nodeType) => {
    const result = workflowNodeConfigSchemas[nodeType].safeParse({});

    expect(result.success).toBe(false);
    expect(issuesAt(result).length).toBeGreaterThan(0);
  });

  it.each(nodeEntries)("drops keys the $0 schema does not declare", (nodeType, config) => {
    const result = workflowNodeConfigSchemas[nodeType].safeParse({ ...config, label: "Node label" });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(config);
  });
});

describe("productInputConfigSchema", () => {
  it("accepts a one-character batchId", () => {
    const result = productInputConfigSchema.safeParse({ batchId: "b" });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ batchId: "b" });
  });

  it("rejects an empty batchId", () => {
    const result = productInputConfigSchema.safeParse({ batchId: "" });

    expectIssue(result, "batchId", "Choose the batch that feeds this workflow.");
  });

  it("rejects a whitespace batchId because the field skips trim()", () => {
    const result = productInputConfigSchema.safeParse({ batchId: "   " });

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

  it("reports the dedicated message for an empty stylePresetId", () => {
    const result = promptSynthesisConfigSchema.safeParse({ ...valid, stylePresetId: "" });

    expectIssue(result, "stylePresetId", "Choose an art style.");
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
  it.each(["leonardo", "sdxl"] as const)("accepts the image model %s", (model) => {
    const result = designImageConfigSchema.safeParse({ model, variants: 1 });

    expect(result.success).toBe(true);
    expect(result.success && result.data.model).toBe(model);
  });

  it.each(["midjourney", "dalle", "", "SDXL"])("rejects %j as an image model", (model) => {
    const result = designImageConfigSchema.safeParse({ model, variants: 1 });

    expectIssue(result, "model", "Choose an image model.");
  });

  it.each([1, 2, 3, 4])("accepts a variant count of %i", (variants) => {
    const result = designImageConfigSchema.safeParse({ model: "sdxl", variants });

    expect(result.success).toBe(true);
    expect(result.success && result.data.variants).toBe(variants);
  });

  it.each([
    { variants: 0, message: "The number of variants must be at least 1." },
    { variants: 5, message: "The number of variants cannot exceed 4." },
  ])("rejects a variant count of $variants", ({ variants, message }) => {
    const result = designImageConfigSchema.safeParse({ model: "sdxl", variants });

    expectIssue(result, "variants", message);
  });

  it("rejects a fractional variant count", () => {
    const result = designImageConfigSchema.safeParse({ model: "sdxl", variants: 1.5 });

    expectIssue(result, "variants", "The number of variants must be a whole number.");
  });

  it.each([undefined, "2", null, true])("rejects %j as a variant count", (variants) => {
    const result = designImageConfigSchema.safeParse({ model: "sdxl", variants });

    expectIssue(result, "variants", "Enter the number of variants.");
  });

  it("rejects a config without variants", () => {
    const result = designImageConfigSchema.safeParse({ model: "sdxl" });

    expectIssue(result, "variants", "Enter the number of variants.");
  });
});

describe("approvalGateConfigSchema", () => {
  it.each(["manual", "auto"] as const)("accepts the %s mode", (mode) => {
    const result = approvalGateConfigSchema.safeParse({ mode });

    expect(result.success).toBe(true);
    expect(result.success && result.data.mode).toBe(mode);
  });

  it.each(["review", "", "Manual", 1])("rejects %j as a mode", (mode) => {
    const result = approvalGateConfigSchema.safeParse({ mode });

    expectIssue(result, "mode", "Choose how designs are approved.");
  });

  it("rejects a config without mode", () => {
    const result = approvalGateConfigSchema.safeParse({});

    expectIssue(result, "mode", "Choose how designs are approved.");
  });
});

describe("applyMockupConfigSchema", () => {
  it("accepts one through five template ids", () => {
    for (const length of [1, 2, 3, 4, 5]) {
      const mockupTemplateIds = Array.from({ length }, (_, index) => `mkp_${index}`);
      const result = applyMockupConfigSchema.safeParse({ mockupTemplateIds });

      expect(result.success).toBe(true);
      expect(result.success && result.data.mockupTemplateIds).toEqual(mockupTemplateIds);
    }
  });

  it("rejects an empty template list", () => {
    const result = applyMockupConfigSchema.safeParse({ mockupTemplateIds: [] });

    expectIssue(result, "mockupTemplateIds", "Choose at least one mock-up template.");
  });

  it("rejects a sixth template id", () => {
    const result = applyMockupConfigSchema.safeParse({
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
    const result = applyMockupConfigSchema.safeParse({ mockupTemplateIds: value });

    expectIssue(result, "mockupTemplateIds");
  });

  it("rejects a non-string entry inside the template list", () => {
    const result = applyMockupConfigSchema.safeParse({ mockupTemplateIds: [1] });

    expectIssue(result, "mockupTemplateIds.0");
  });

  it("rejects a config without the template list", () => {
    const result = applyMockupConfigSchema.safeParse({});

    expectIssue(result, "mockupTemplateIds");
  });
});

describe("generateVideoConfigSchema", () => {
  const valid = { template: "slideshow", durationSeconds: 20, withMusic: true };

  it("accepts a fully populated config", () => {
    const result = generateVideoConfigSchema.safeParse(valid);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(valid);
  });

  it.each(["slideshow", "showcase", "lifestyle-reel", "vertical-story"] as const)(
    "accepts the video template %s",
    (template) => {
      const result = generateVideoConfigSchema.safeParse({ ...valid, template });

      expect(result.success).toBe(true);
      expect(result.success && result.data.template).toBe(template);
    }
  );

  it.each(["reel", "", "Slideshow", "vertical_reel"])("rejects %j as a video template", (template) => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, template });

    expectIssue(result, "template", "Choose a video template.");
  });

  it.each([15, 20, 29, 30])("accepts a duration of %i seconds", (durationSeconds) => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, durationSeconds });

    expect(result.success).toBe(true);
    expect(result.success && result.data.durationSeconds).toBe(durationSeconds);
  });

  it.each([
    { durationSeconds: 14, message: "The video duration must be at least 15." },
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

  it.each(["true", 1, null])("rejects %j for withMusic", (withMusic) => {
    const result = generateVideoConfigSchema.safeParse({ ...valid, withMusic });

    expectIssue(result, "withMusic");
  });

  it("rejects a config without withMusic", () => {
    const result = generateVideoConfigSchema.safeParse({ template: "slideshow", durationSeconds: 20 });

    expectIssue(result, "withMusic");
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
  it("accepts both flags", () => {
    const result = exportZipConfigSchema.safeParse({ includeVideo: true, includeListingCsv: true });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ includeVideo: true, includeListingCsv: true });
  });

  it("rejects a config without either flag", () => {
    const result = exportZipConfigSchema.safeParse({});

    expectIssue(result, "includeVideo");
    expectIssue(result, "includeListingCsv");
  });

  it.each(["includeVideo", "includeListingCsv"] as const)(
    "rejects a string for the boolean %s",
    (field) => {
      const result = exportZipConfigSchema.safeParse({ includeVideo: true, includeListingCsv: true, [field]: "yes" });

      expectIssue(result, field);
    }
  );
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