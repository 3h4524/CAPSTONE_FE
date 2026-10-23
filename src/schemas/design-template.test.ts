import { describe, expect, it } from "vitest";
import type { ZodSafeParseResult } from "zod";

import { designTemplateSchema } from "@/schemas/design-template";

const validTemplate = {
  name: "Retro diner",
  nicheCategory: "Food",
  artStyle: "Vaporwave",
  basePrompt: "A chrome toaster in a {niche} diner, {style} treatment",
  negativePrompt: "blurry, watermark",
  examples: [{ subject: "Toaster", prompt: "A chrome toaster on a diner counter" }],
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

const SUPPORTED = ["subject", "niche", "style", "keywords"];

describe("designTemplateSchema", () => {
  it("accepts a fully populated template and returns every field untouched", () => {
    const result = designTemplateSchema.safeParse(validTemplate);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validTemplate);
  });

  it("accepts the minimal template: empty negative prompt and no examples", () => {
    const result = designTemplateSchema.safeParse({
      name: "Retro diner",
      nicheCategory: "Food",
      artStyle: "Vaporwave",
      basePrompt: "A chrome toaster",
      negativePrompt: "",
      examples: [],
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({
      name: "Retro diner",
      nicheCategory: "Food",
      artStyle: "Vaporwave",
      basePrompt: "A chrome toaster",
      negativePrompt: "",
      examples: [],
    });
  });

  it("trims the name and the base prompt but not the negative prompt", () => {
    const result = designTemplateSchema.safeParse({
      ...validTemplate,
      name: "  Retro diner  ",
      basePrompt: "  A chrome toaster  ",
      negativePrompt: "  blurry  ",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe("Retro diner");
    expect(result.success && result.data.basePrompt).toBe("A chrome toaster");
    expect(result.success && result.data.negativePrompt).toBe("  blurry  ");
  });

  it("drops keys the schema does not declare", () => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, authorId: "usr_1" });

    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data).sort()).toEqual([
      "artStyle",
      "basePrompt",
      "examples",
      "name",
      "negativePrompt",
      "nicheCategory",
    ]);
  });

  it.each([
    "name",
    "nicheCategory",
    "artStyle",
    "basePrompt",
    "negativePrompt",
    "examples",
  ] as const)("rejects a template without %s", (field) => {
    const result = designTemplateSchema.safeParse(omitKey(validTemplate, field));

    expectIssue(result, field);
  });

  it.each([
    { field: "name", message: "Name is required." },
    { field: "basePrompt", message: "Base prompt is required." },
  ] as const)("rejects a $field of only whitespace", ({ field, message }) => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, [field]: "   " });

    expectIssue(result, field, message);
  });

  it.each([
    { field: "nicheCategory", message: "Choose a niche." },
    { field: "artStyle", message: "Choose an art style." },
  ] as const)("rejects an empty $field", ({ field, message }) => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, [field]: "" });

    expectIssue(result, field, message);
  });

  it.each([
    { field: "nicheCategory", message: "Choose a niche." },
    { field: "artStyle", message: "Choose an art style." },
  ] as const)("accepts a $field of only whitespace because it skips trim()", ({ field, message }) => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, [field]: "   " });

    expect(result.success).toBe(true);
    expect(result.success && result.data[field]).toBe("   ");
    expect(issuesAt(result).map((issue) => issue.message)).not.toContain(message);
  });

  it("allows an empty negative prompt because only the base prompt is required", () => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, negativePrompt: "" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.negativePrompt).toBe("");
  });

  it.each([
    { field: "name", max: 255 },
    { field: "basePrompt", max: 1000 },
    { field: "negativePrompt", max: 1000 },
  ] as const)("accepts $field at $max characters and rejects $max + 1", ({ field, max }) => {
    const atLimit = designTemplateSchema.safeParse({ ...validTemplate, [field]: "x".repeat(max) });
    const overLimit = designTemplateSchema.safeParse({ ...validTemplate, [field]: "x".repeat(max + 1) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, field);
  });

  it("reports the dedicated message when the name exceeds 255 characters", () => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, name: "x".repeat(256) });

    expectIssue(result, "name", "Name must be 255 characters or fewer.");
  });

  it("reports the dedicated message when the base prompt exceeds 1,000 characters", () => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, basePrompt: "x".repeat(1001) });

    expectIssue(result, "basePrompt", "Base prompt must be 1,000 characters or fewer.");
  });

  it("reports the dedicated message when the negative prompt exceeds 1,000 characters", () => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, negativePrompt: "x".repeat(1001) });

    expectIssue(result, "negativePrompt", "Negative prompt must be 1,000 characters or fewer.");
  });

  it("accepts exactly five examples", () => {
    const result = designTemplateSchema.safeParse({
      ...validTemplate,
      examples: Array.from({ length: 5 }, (_, index) => ({
        subject: `Subject ${index}`,
        prompt: `Prompt ${index}`,
      })),
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.examples).toHaveLength(5);
  });

  it("rejects a sixth example", () => {
    const result = designTemplateSchema.safeParse({
      ...validTemplate,
      examples: Array.from({ length: 6 }, () => ({ subject: "Toaster", prompt: "A chrome toaster" })),
    });

    expectIssue(result, "examples", "You can add up to five examples.");
  });

  it.each([
    { field: "subject", message: "Subject is required." },
    { field: "prompt", message: "Example prompt is required." },
  ] as const)("rejects an example whose $field is only whitespace", ({ field, message }) => {
    const result = designTemplateSchema.safeParse({
      ...validTemplate,
      examples: [{ ...validTemplate.examples[0], [field]: "   " }],
    });

    expectIssue(result, `examples.0.${field}`, message);
  });

  it("rejects an example missing the prompt key", () => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, examples: [{ subject: "Toaster" }] });

    expectIssue(result, "examples.0.prompt");
  });

  it.each([
    { field: "name", value: 7 },
    { field: "nicheCategory", value: null },
    { field: "artStyle", value: true },
    { field: "basePrompt", value: 7 },
    { field: "negativePrompt", value: 7 },
    { field: "examples", value: "Toaster" },
  ] as const)("rejects a $field of the wrong type", ({ field, value }) => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, [field]: value });

    expectIssue(result, field);
  });

  it.each(SUPPORTED.map((placeholder) => ({ placeholder })))(
    "accepts the supported placeholder {$placeholder} in both prompts",
    ({ placeholder }) => {
      const result = designTemplateSchema.safeParse({
        ...validTemplate,
        basePrompt: `A {${placeholder}} scene`,
        negativePrompt: `No {${placeholder}} in frame`,
      });

      expect(result.success).toBe(true);
    }
  );

  it("accepts all four supported placeholders in a single base prompt", () => {
    const result = designTemplateSchema.safeParse({
      ...validTemplate,
      basePrompt: "{subject} in a {niche} cafe, {style} style, {keywords}",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.basePrompt).toBe("{subject} in a {niche} cafe, {style} style, {keywords}");
  });

  it("accepts a base prompt with no placeholder at all", () => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, basePrompt: "A plain chrome toaster" });

    expect(result.success).toBe(true);
  });

  it.each([
    { label: "wrong case", value: "{Subject}" },
    { label: "unknown name", value: "{artist}" },
    { label: "singular typo", value: "{keyword}" },
    { label: "plural typo", value: "{niches}" },
    { label: "padded with spaces", value: "{ subject }" },
    { label: "a JSON snippet", value: '{"style": "vaporwave"}' },
  ])("rejects a base prompt holding $label", ({ value }) => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, basePrompt: `A scene ${value} here` });

    expectIssue(result, "basePrompt", "The prompt contains an unsupported placeholder.");
  });

  it("rejects an unsupported placeholder in the negative prompt too", () => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, negativePrompt: "{artist} hands" });

    expectIssue(result, "negativePrompt", "The prompt contains an unsupported placeholder.");
  });

  it.each([
    { label: "an unclosed brace", value: "{subject" },
    { label: "a stray closing brace", value: "subject}" },
    { label: "empty braces", value: "{}" },
    { label: "doubled braces", value: "{{subject}}" },
    { label: "an extra closing brace", value: "{subject}}" },
  ])("accepts $label because the placeholder regex never matches it", ({ value }) => {
    const result = designTemplateSchema.safeParse({ ...validTemplate, basePrompt: `A scene ${value} here` });

    expect(result.success).toBe(true);
  });
});