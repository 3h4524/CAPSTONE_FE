import { describe, expect, it } from "vitest";
import type { ZodSafeParseResult } from "zod";

import { deletePlanFormSchema, subscriptionPlanFormSchema } from "@/schemas/subscription-plan";

const validPlan = {
  name: "Pro",
  tier: "pro-plan",
  description: "For growing shops",
  monthlyPriceUsd: 29,
  annualPriceUsd: 290,
  maxBatchSize: -1,
  maxConcurrentJobs: 2,
  maxProductsPerMonth: 100,
  imageGenerationQuota: 500,
  videoGenerationQuota: 10,
  apiCallQuota: -1,
  storageQuotaGb: 25,
  customApiKeysAllowed: true,
  whiteLabelExportEnabled: false,
  prioritySupport: true,
  isActive: true,
};

const quotaFields = [
  { field: "maxBatchSize", label: "Max batch size" },
  { field: "maxConcurrentJobs", label: "Concurrent jobs" },
  { field: "maxProductsPerMonth", label: "Products / month" },
  { field: "imageGenerationQuota", label: "Images / month" },
  { field: "videoGenerationQuota", label: "Videos / month" },
  { field: "apiCallQuota", label: "API calls / month" },
  { field: "storageQuotaGb", label: "Storage (GB)" },
] as const;

const requiredFields = [
  "name",
  "tier",
  "monthlyPriceUsd",
  "maxBatchSize",
  "maxConcurrentJobs",
  "maxProductsPerMonth",
  "imageGenerationQuota",
  "videoGenerationQuota",
  "apiCallQuota",
  "storageQuotaGb",
  "customApiKeysAllowed",
  "whiteLabelExportEnabled",
  "prioritySupport",
  "isActive",
] as const;

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

describe("subscriptionPlanFormSchema", () => {
  it("accepts a fully populated plan and returns every field untouched", () => {
    const result = subscriptionPlanFormSchema.safeParse(validPlan);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validPlan);
  });

  it("keeps description and annualPriceUsd optional", () => {
    const { description: _description, annualPriceUsd: _annualPriceUsd, ...withoutOptionals } = validPlan;
    const result = subscriptionPlanFormSchema.safeParse(withoutOptionals);

    expect(result.success).toBe(true);
    expect(result.success && result.data.description).toBeUndefined();
    expect(result.success && result.data.annualPriceUsd).toBeUndefined();
  });

  it("trims the three string fields", () => {
    const result = subscriptionPlanFormSchema.safeParse({
      ...validPlan,
      name: "  Pro  ",
      tier: "  pro-plan  ",
      description: "  For growing shops  ",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe("Pro");
    expect(result.success && result.data.tier).toBe("pro-plan");
    expect(result.success && result.data.description).toBe("For growing shops");
  });

  it("drops keys the schema does not declare", () => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, id: "plan_1" });

    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data).sort()).toEqual(
      [...requiredFields, "description", "annualPriceUsd"].sort()
    );
  });

  it.each(requiredFields)("rejects a plan without %s", (field) => {
    const result = subscriptionPlanFormSchema.safeParse(omitKey(validPlan, field));

    expectIssue(result, field);
  });

  it.each([
    { field: "name", value: "   ", message: "Enter a plan name." },
    { field: "tier", value: "   ", message: "Enter a tier slug." },
  ] as const)("rejects a $field of only whitespace", ({ field, value, message }) => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: value });

    expectIssue(result, field, message);
  });

  it.each([
    { label: "one character", value: "P", success: true },
    { label: "100 characters", value: "x".repeat(100), success: true },
    { label: "101 characters", value: "x".repeat(101), success: false },
  ])("handles a plan name of $label", ({ value, success }) => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, name: value });

    expect(result.success).toBe(success);
  });

  it.each([
    { value: "pro", success: true },
    { value: "pro-plan", success: true },
    { value: "plan-2026-v2", success: true },
    { value: "pro1", success: true },
    { value: "Pro-Plan", success: false },
    { value: "pro plan", success: false },
    { value: "pro_plan", success: false },
    { value: "pro.plan", success: false },
    { value: "-pro", success: true },
    { value: "pro-", success: true },
    { value: "pro--plan", success: true },
  ])("applies the BR194 tier slug rule to $value", ({ value, success }) => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, tier: value });

    expect(result.success).toBe(success);
  });

  it("reports the dedicated message for a tier that breaks BR194", () => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, tier: "Pro Plan" });

    expectIssue(result, "tier", "Tier slug must be lowercase and contain no spaces.");
  });

  it.each([
    { label: "zero", value: 0, success: true },
    { label: "a fractional amount", value: 9.99, success: true },
    { label: "a negative amount", value: -1, success: false },
  ])("handles a monthly price of $label", ({ value, success }) => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, monthlyPriceUsd: value });

    expect(result.success).toBe(success);
  });

  it("reports the dedicated message for a negative monthly price", () => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, monthlyPriceUsd: -1 });

    expectIssue(result, "monthlyPriceUsd", "Monthly price must be 0 or greater.");
  });

  it.each([
    { field: "monthlyPriceUsd", message: "Enter a monthly price." },
    { field: "annualPriceUsd", message: undefined },
  ] as const)("rejects a string $field", ({ field, message }) => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: "29" });

    expectIssue(result, field, message);
  });

  it("rejects a negative annual price", () => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, annualPriceUsd: -0.01 });

    expectIssue(result, "annualPriceUsd", "Annual price must be 0 or greater.");
  });

  it.each(quotaFields.map(({ field, label }) => ({ field, label })))(
    "accepts 0, a positive amount and -1 for the $label quota",
    ({ field }) => {
      const zero = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: 0 });
      const positive = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: 7 });
      const unlimited = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: -1 });

      expect(zero.success).toBe(true);
      expect(positive.success).toBe(true);
      expect(unlimited.success).toBe(true);
    }
  );

  it.each(quotaFields.map(({ field, label }) => ({ field, label })))(
    "rejects -2 for the $label quota",
    ({ field, label }) => {
      const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: -2 });

      expectIssue(result, field, `${label} must be 0 or greater, or -1 for unlimited.`);
    }
  );

  it.each(quotaFields.map(({ field, label }) => ({ field, label })))(
    "rejects a fractional negative value for the $label quota",
    ({ field }) => {
      const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: -1.5 });

      expectIssue(result, field);
    }
  );

  it.each(quotaFields.map(({ field, label }) => ({ field, label })))(
    "reports the BR195 number message when the $label quota is missing",
    ({ field, label }) => {
      const result = subscriptionPlanFormSchema.safeParse(omitKey(validPlan, field));

      expectIssue(result, field, `Enter a number for ${label}.`);
    }
  );

  it.each(quotaFields.map(({ field, label }) => ({ field, label })))(
    "reports the BR195 number message when the $label quota is a string",
    ({ field, label }) => {
      const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: "10" });

      expectIssue(result, field, `Enter a number for ${label}.`);
    }
  );

  it.each(quotaFields.map(({ field, label }) => ({ field, label })))(
    "accepts a fractional $label quota because the BR195 rule skips int()",
    ({ field }) => {
      const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: 1.5 });

      expect(result.success).toBe(true);
      expect(result.success && result.data[field]).toBe(1.5);
    }
  );

  it("rejects a description longer than 2,000 characters", () => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, description: "x".repeat(2001) });

    expectIssue(result, "description");
  });

  it.each([
    "customApiKeysAllowed",
    "whiteLabelExportEnabled",
    "prioritySupport",
    "isActive",
  ] as const)("rejects a string for the boolean %s", (field) => {
    const result = subscriptionPlanFormSchema.safeParse({ ...validPlan, [field]: "true" });

    expectIssue(result, field);
  });
});

describe("deletePlanFormSchema", () => {
  it("accepts a reason and returns it trimmed", () => {
    const result = deletePlanFormSchema.safeParse({ reason: "  Plan never launched  " });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ reason: "Plan never launched" });
  });

  it("rejects a payload without a reason", () => {
    const result = deletePlanFormSchema.safeParse({});

    expectIssue(result, "reason");
  });

  it.each(["", "   "])("rejects %j as a reason", (reason) => {
    const result = deletePlanFormSchema.safeParse({ reason });

    expectIssue(result, "reason", "Enter a reason for deleting this plan.");
  });

  it("accepts a 500-character reason and rejects 501", () => {
    const atLimit = deletePlanFormSchema.safeParse({ reason: "x".repeat(500) });
    const overLimit = deletePlanFormSchema.safeParse({ reason: "x".repeat(501) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, "reason");
  });

  it("rejects a reason of the wrong type", () => {
    const result = deletePlanFormSchema.safeParse({ reason: 500 });

    expectIssue(result, "reason");
  });
});