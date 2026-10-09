import { describe, expect, it } from "vitest";
import type { ZodSafeParseResult } from "zod";

import { batchSchema, productSchema, productTypes } from "@/schemas/batches";

const validBatch = {
  name: "Summer drop",
  description: "Ships in August",
  defaultNiche: "Coffee",
  defaultProductType: "mug" as const,
};

const validProduct = {
  name: "Espresso cup",
  productType: "mug" as const,
  niche: "Coffee",
  keywords: "latte, espresso, barista",
  productDescription: "Glazed ceramic",
  sourceNotes: "From supplier A",
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

describe("productTypes", () => {
  it("lists the six product types the batch and product schemas accept", () => {
    expect(productTypes).toEqual([
      "tshirt",
      "hoodie",
      "mug",
      "poster",
      "tote_bag",
      "phone_case",
    ]);
  });
});

describe("batchSchema", () => {
  it("accepts a fully populated batch and returns every field untouched", () => {
    const result = batchSchema.safeParse(validBatch);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validBatch);
  });

  it("trims the batch name and leaves the remaining fields alone", () => {
    const result = batchSchema.safeParse({
      ...validBatch,
      name: "   Summer drop   ",
      defaultNiche: "  Coffee  ",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe("Summer drop");
    expect(result.success && result.data.defaultNiche).toBe("  Coffee  ");
  });

  it("drops keys the schema does not declare", () => {
    const result = batchSchema.safeParse({ ...validBatch, ownerId: "usr_1" });

    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data).sort()).toEqual([
      "defaultNiche",
      "defaultProductType",
      "description",
      "name",
    ]);
  });

  it.each(["name", "description", "defaultNiche", "defaultProductType"] as const)(
    "rejects a batch without %s",
    (field) => {
      const result = batchSchema.safeParse(omitKey(validBatch, field));

      expectIssue(result, field);
    }
  );

  it("rejects a batch name of only whitespace", () => {
    const result = batchSchema.safeParse({ ...validBatch, name: "   " });

    expectIssue(result, "name", "Enter a batch name.");
  });

  it.each([
    { label: "one character", value: "a", success: true },
    { label: "255 characters", value: "a".repeat(255), success: true },
    { label: "256 characters", value: "a".repeat(256), success: false },
  ])("handles a batch name of $label", ({ value, success }) => {
    const result = batchSchema.safeParse({ ...validBatch, name: value });

    expect(result.success).toBe(success);
  });

  it.each(productTypes.map((value) => ({ value })))(
    "accepts defaultProductType $value",
    ({ value }) => {
      const result = batchSchema.safeParse({ ...validBatch, defaultProductType: value });

      expect(result.success).toBe(true);
      expect(result.success && result.data.defaultProductType).toBe(value);
    }
  );

  it("accepts an empty defaultProductType so a batch can start unassigned", () => {
    const result = batchSchema.safeParse({ ...validBatch, defaultProductType: "" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.defaultProductType).toBe("");
  });

  it("rejects a defaultProductType outside the enum", () => {
    const result = batchSchema.safeParse({ ...validBatch, defaultProductType: "hat" });

    expectIssue(result, "defaultProductType");
  });

  it.each([
    { field: "description", max: 2000 },
    { field: "defaultNiche", max: 255 },
  ] as const)("accepts $field at $max characters and rejects $max + 1", ({ field, max }) => {
    const atLimit = batchSchema.safeParse({ ...validBatch, [field]: "x".repeat(max) });
    const overLimit = batchSchema.safeParse({ ...validBatch, [field]: "x".repeat(max + 1) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, field);
  });

  it.each([
    { field: "name", value: 7 },
    { field: "description", value: 7 },
    { field: "defaultNiche", value: null },
    { field: "defaultProductType", value: true },
  ] as const)("rejects a non-string $field", ({ field, value }) => {
    const result = batchSchema.safeParse({ ...validBatch, [field]: value });

    expectIssue(result, field);
  });
});

describe("productSchema", () => {
  it("accepts a fully populated product and returns every field untouched", () => {
    const result = productSchema.safeParse(validProduct);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validProduct);
  });

  it("trims the name and niche", () => {
    const result = productSchema.safeParse({ ...validProduct, name: "  Espresso cup ", niche: " Coffee " });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ ...validProduct, name: "Espresso cup", niche: "Coffee" });
  });

  it.each([
    "name",
    "productType",
    "niche",
    "keywords",
    "productDescription",
    "sourceNotes",
  ] as const)("rejects a product without %s", (field) => {
    const result = productSchema.safeParse(omitKey(validProduct, field));

    expectIssue(result, field);
  });

  it("rejects a product name of only whitespace", () => {
    const result = productSchema.safeParse({ ...validProduct, name: "   " });

    expectIssue(result, "name", "Enter a product name.");
  });

  it("rejects a niche of only whitespace", () => {
    const result = productSchema.safeParse({ ...validProduct, niche: "   " });

    expectIssue(result, "niche", "Enter a niche.");
  });

  it.each([
    { field: "name", max: 255 },
    { field: "niche", max: 255 },
  ] as const)("accepts $field at $max characters and rejects $max + 1", ({ field, max }) => {
    const atLimit = productSchema.safeParse({ ...validProduct, [field]: "x".repeat(max) });
    const overLimit = productSchema.safeParse({ ...validProduct, [field]: "x".repeat(max + 1) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, field);
  });

  it.each(productTypes.map((value) => ({ value })))("accepts productType $value", ({ value }) => {
    const result = productSchema.safeParse({ ...validProduct, productType: value });

    expect(result.success).toBe(true);
    expect(result.success && result.data.productType).toBe(value);
  });

  it("rejects a productType outside the enum", () => {
    const result = productSchema.safeParse({ ...validProduct, productType: "hat" });

    expectIssue(result, "productType");
  });

  it.each([
    { label: "a single keyword", value: "latte", count: 1 },
    { label: "13 keywords", value: Array.from({ length: 13 }, (_, index) => `k${index}`).join(","), count: 13 },
    {
      label: "surrounding whitespace and a trailing comma",
      value: "latte, espresso, barista, ",
      count: 3,
    },
  ])("accepts keywords with $label", ({ value, count }) => {
    const result = productSchema.safeParse({ ...validProduct, keywords: value });

    expect(result.success).toBe(true);
    expect(result.success && result.data.keywords.split(",").map((item) => item.trim()).filter(Boolean)).toHaveLength(count);
  });

  it.each([
    { label: "an empty string", value: "" },
    { label: "only separators", value: " , , " },
    { label: "only whitespace", value: "   " },
  ])("rejects keywords with $label", ({ value }) => {
    const result = productSchema.safeParse({ ...validProduct, keywords: value });

    expectIssue(result, "keywords", "Enter at least one keyword.");
  });

  it("rejects a fourteenth keyword", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      keywords: Array.from({ length: 14 }, (_, index) => `k${index}`).join(","),
    });

    expectIssue(result, "keywords", "Use no more than 13 keywords.");
  });

  it("accepts 2,000 characters of productDescription and rejects 2,001", () => {
    const atLimit = productSchema.safeParse({ ...validProduct, productDescription: "x".repeat(2000) });
    const overLimit = productSchema.safeParse({ ...validProduct, productDescription: "x".repeat(2001) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, "productDescription", "Use no more than 2,000 characters.");
  });

  it("accepts 2,000 characters of sourceNotes and rejects 2,001", () => {
    const atLimit = productSchema.safeParse({ ...validProduct, sourceNotes: "x".repeat(2000) });
    const overLimit = productSchema.safeParse({ ...validProduct, sourceNotes: "x".repeat(2001) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, "sourceNotes");
  });

  it.each([
    { field: "name", value: 12 },
    { field: "niche", value: 12 },
    { field: "keywords", value: 12 },
    { field: "productDescription", value: true },
    { field: "sourceNotes", value: 12 },
  ] as const)("rejects a non-string $field", ({ field, value }) => {
    const result = productSchema.safeParse({ ...validProduct, [field]: value });

    expectIssue(result, field);
  });
});