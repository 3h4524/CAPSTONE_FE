import { describe, expect, it } from "vitest";
import type { ZodSafeParseResult } from "zod";

import { MAX_EFFECTIVE_PROMPT_LENGTH, productPromptSchema } from "@/schemas/product-prompt";

const validPrompt = {
  subject: "Espresso machine",
  artStyle: "Watercolour",
  moodTone: "Calm morning",
  negativeTerms: "blurry, watermark",
  instructions: "Keep the palette warm",
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

describe("MAX_EFFECTIVE_PROMPT_LENGTH", () => {
  it("caps the composed prompt at 1,000 characters, the same ceiling as the instructions field", () => {
    expect(MAX_EFFECTIVE_PROMPT_LENGTH).toBe(1000);
    expect(productPromptSchema.shape.instructions.safeParse("x".repeat(MAX_EFFECTIVE_PROMPT_LENGTH)).success).toBe(true);
    expect(
      productPromptSchema.shape.instructions.safeParse("x".repeat(MAX_EFFECTIVE_PROMPT_LENGTH + 1)).success
    ).toBe(false);
  });
});

describe("productPromptSchema", () => {
  it("accepts a fully populated prompt and returns every field untouched", () => {
    const result = productPromptSchema.safeParse(validPrompt);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validPrompt);
  });

  it("accepts empty optional fields", () => {
    const result = productPromptSchema.safeParse({
      subject: "Espresso machine",
      artStyle: "Watercolour",
      moodTone: "Calm morning",
      negativeTerms: "",
      instructions: "",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({
      subject: "Espresso machine",
      artStyle: "Watercolour",
      moodTone: "Calm morning",
      negativeTerms: "",
      instructions: "",
    });
  });

  it("trims the three required fields and leaves the two optional ones alone", () => {
    const result = productPromptSchema.safeParse({
      ...validPrompt,
      subject: "  Espresso machine ",
      artStyle: " Watercolour ",
      moodTone: " Calm morning ",
      negativeTerms: "  blurry ",
      instructions: "  warm palette ",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({
      subject: "Espresso machine",
      artStyle: "Watercolour",
      moodTone: "Calm morning",
      negativeTerms: "  blurry ",
      instructions: "  warm palette ",
    });
  });

  it("drops keys the schema does not declare", () => {
    const result = productPromptSchema.safeParse({ ...validPrompt, batchId: "bat_1" });

    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data).sort()).toEqual([
      "artStyle",
      "instructions",
      "moodTone",
      "negativeTerms",
      "subject",
    ]);
  });

  it.each(["subject", "artStyle", "moodTone", "negativeTerms", "instructions"] as const)(
    "rejects a prompt without %s",
    (field) => {
      const result = productPromptSchema.safeParse(omitKey(validPrompt, field));

      expectIssue(result, field);
    }
  );

  it.each([
    { field: "subject", message: "The Subject field is required." },
    { field: "artStyle", message: "The Art Style field is required." },
    { field: "moodTone", message: "The Mood Tone field is required." },
  ] as const)("rejects a $field of only whitespace", ({ field, message }) => {
    const result = productPromptSchema.safeParse({ ...validPrompt, [field]: "   " });

    expectIssue(result, field, message);
  });

  it.each([
    { field: "subject", max: 200 },
    { field: "artStyle", max: 100 },
    { field: "moodTone", max: 200 },
    { field: "negativeTerms", max: 500 },
    { field: "instructions", max: 1000 },
  ] as const)("accepts $field at $max characters and rejects $max + 1", ({ field, max }) => {
    const atLimit = productPromptSchema.safeParse({ ...validPrompt, [field]: "x".repeat(max) });
    const overLimit = productPromptSchema.safeParse({ ...validPrompt, [field]: "x".repeat(max + 1) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, field);
  });

  it("accepts a one-character required field", () => {
    const result = productPromptSchema.safeParse({ ...validPrompt, subject: "C", artStyle: "W", moodTone: "M" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.subject).toBe("C");
  });

  it.each([
    { field: "subject", value: true },
    { field: "artStyle", value: 42 },
    { field: "moodTone", value: null },
    { field: "negativeTerms", value: false },
    { field: "instructions", value: ["warm"] },
  ] as const)("rejects a $field of the wrong type", ({ field, value }) => {
    const result = productPromptSchema.safeParse({ ...validPrompt, [field]: value });

    expectIssue(result, field);
  });
});