import { describe, expect, it } from "vitest";
import type { ZodSafeParseResult } from "zod";

import { stylePresetSchema } from "@/schemas/style-preset";

const validPreset = {
  name: "Vaporwave",
  description: "Soft neon gradient with chrome highlights",
  styleModifiers: "neon glow, chrome, gradient mesh",
  recommendationsText: "Try a darker background",
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

describe("stylePresetSchema", () => {
  it("accepts a fully populated preset and returns every field untouched", () => {
    const result = stylePresetSchema.safeParse(validPreset);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validPreset);
  });

  it("accepts an empty recommendations text because only its length is constrained", () => {
    const result = stylePresetSchema.safeParse({ ...validPreset, recommendationsText: "" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.recommendationsText).toBe("");
  });

  it("trims the three required fields and leaves recommendations alone", () => {
    const result = stylePresetSchema.safeParse({
      ...validPreset,
      name: "  Vaporwave  ",
      description: "  Soft neon gradient  ",
      styleModifiers: "  neon glow  ",
      recommendationsText: "  Try darker ",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({
      name: "Vaporwave",
      description: "Soft neon gradient",
      styleModifiers: "neon glow",
      recommendationsText: "  Try darker ",
    });
  });

  it("drops keys the schema does not declare", () => {
    const result = stylePresetSchema.safeParse({ ...validPreset, styleId: "sty_1" });

    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data).sort()).toEqual([
      "description",
      "name",
      "recommendationsText",
      "styleModifiers",
    ]);
  });

  it.each(["name", "description", "styleModifiers", "recommendationsText"] as const)(
    "rejects a preset without %s",
    (field) => {
      const result = stylePresetSchema.safeParse(omitKey(validPreset, field));

      expectIssue(result, field);
    }
  );

  it.each([
    { field: "name", message: "Give the style a name (at least 2 characters)." },
    { field: "description", message: "Add a little more detail (at least 10 characters)." },
    { field: "styleModifiers", message: "Add the keywords appended to the prompt." },
  ] as const)("rejects a $field of only whitespace", ({ field, message }) => {
    const result = stylePresetSchema.safeParse({ ...validPreset, [field]: "   " });

    expectIssue(result, field, message);
  });

  it.each([
    { field: "name", min: 2, max: 120 },
    { field: "description", min: 10, max: 2000 },
    { field: "styleModifiers", min: 3, max: 500 },
    { field: "recommendationsText", min: 0, max: 500 },
  ] as const)("accepts $field at its $min and $max boundaries", ({ field, min, max }) => {
    const atMin = stylePresetSchema.safeParse({ ...validPreset, [field]: "x".repeat(min) });
    const atMax = stylePresetSchema.safeParse({ ...validPreset, [field]: "x".repeat(max) });

    expect(atMin.success).toBe(true);
    expect(atMax.success).toBe(true);
  });

  it.each([
    { field: "name", min: 2 },
    { field: "description", min: 10 },
    { field: "styleModifiers", min: 3 },
  ] as const)("rejects $field one character below its $min boundary", ({ field, min }) => {
    const result = stylePresetSchema.safeParse({ ...validPreset, [field]: "x".repeat(min - 1) });

    expectIssue(result, field);
  });

  it.each([
    { field: "name", max: 120 },
    { field: "description", max: 2000 },
    { field: "styleModifiers", max: 500 },
    { field: "recommendationsText", max: 500 },
  ] as const)("rejects $field one character above its $max boundary", ({ field, max }) => {
    const result = stylePresetSchema.safeParse({ ...validPreset, [field]: "x".repeat(max + 1) });

    expectIssue(result, field);
  });

  it("reports the dedicated message when recommendations exceed 500 characters", () => {
    const result = stylePresetSchema.safeParse({ ...validPreset, recommendationsText: "x".repeat(501) });

    expectIssue(result, "recommendationsText", "Keep recommendations under 500 characters.");
  });

  it.each([
    { field: "name", value: 12 },
    { field: "description", value: null },
    { field: "styleModifiers", value: 12 },
    { field: "recommendationsText", value: false },
  ] as const)("rejects a $field of the wrong type", ({ field, value }) => {
    const result = stylePresetSchema.safeParse({ ...validPreset, [field]: value });

    expectIssue(result, field);
  });
});