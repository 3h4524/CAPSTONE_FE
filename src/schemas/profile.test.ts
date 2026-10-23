import { describe, expect, it } from "vitest";
import type { ZodSafeParseResult } from "zod";

import { LANGUAGE_VALUES, THEME_VALUES, TIMEZONES } from "@/constants/profile";
import { profileSchema } from "@/schemas/profile";

const validProfile = {
  fullName: "Nhat Nguyen",
  email: "seller@apcs.test",
  shopName: "APCS Studio",
  shopDescription: "Print on demand shop",
  timezone: "Asia/Ho_Chi_Minh",
  language: "vi",
  themePreference: "system",
  notificationEmailEnabled: true,
  newsletterSubscribed: false,
  twoFactorEnabled: true,
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

const requiredFields = [
  "fullName",
  "email",
  "shopName",
  "shopDescription",
  "timezone",
  "language",
  "themePreference",
  "notificationEmailEnabled",
  "newsletterSubscribed",
  "twoFactorEnabled",
] as const;

describe("profileSchema", () => {
  it("accepts a fully populated profile and returns every field untouched", () => {
    const result = profileSchema.safeParse(validProfile);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validProfile);
  });

  it("accepts empty shop fields because only the length is constrained", () => {
    const result = profileSchema.safeParse({ ...validProfile, shopName: "", shopDescription: "" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.shopName).toBe("");
    expect(result.success && result.data.shopDescription).toBe("");
  });

  it("trims the full name only", () => {
    const result = profileSchema.safeParse({ ...validProfile, fullName: "  Nhat Nguyen  " });

    expect(result.success).toBe(true);
    expect(result.success && result.data.fullName).toBe("Nhat Nguyen");
  });

  it("drops keys the schema does not declare", () => {
    const result = profileSchema.safeParse({ ...validProfile, password: "Valid1234" });

    expect(result.success).toBe(true);
    expect(result.success && Object.keys(result.data).sort()).toEqual([...requiredFields].sort());
  });

  it.each(requiredFields)("rejects a profile without %s", (field) => {
    const result = profileSchema.safeParse(omitKey(validProfile, field));

    expectIssue(result, field);
  });

  it("rejects a full name of only whitespace", () => {
    const result = profileSchema.safeParse({ ...validProfile, fullName: "   " });

    expectIssue(result, "fullName", "Full name is required");
  });

  it("accepts a one-character full name and a 100-character one", () => {
    const shortest = profileSchema.safeParse({ ...validProfile, fullName: "N" });
    const longest = profileSchema.safeParse({ ...validProfile, fullName: "x".repeat(100) });

    expect(shortest.success).toBe(true);
    expect(longest.success).toBe(true);
  });

  it("rejects a full name longer than 100 characters", () => {
    const result = profileSchema.safeParse({ ...validProfile, fullName: "x".repeat(101) });

    expectIssue(result, "fullName", "Full name is too long");
  });

  it.each([
    { field: "shopName", max: 100 },
    { field: "shopDescription", max: 100 },
  ] as const)("accepts $field at $max characters and rejects $max + 1", ({ field, max }) => {
    const atLimit = profileSchema.safeParse({ ...validProfile, [field]: "x".repeat(max) });
    const overLimit = profileSchema.safeParse({ ...validProfile, [field]: "x".repeat(max + 1) });

    expect(atLimit.success).toBe(true);
    expectIssue(overLimit, field);
  });

  it("reports the dedicated message for each shop field overflow", () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      shopName: "x".repeat(101),
      shopDescription: "x".repeat(101),
    });

    expectIssue(result, "shopName", "Shop name is too long");
    expectIssue(result, "shopDescription", "Shop description is too long");
  });

  it.each(["", "nope", "seller@", "@apcs.test", "seller@apcs", "seller @apcs.test", "seller@apcs.test "])(
    "rejects %j as an email address",
    (email) => {
      const result = profileSchema.safeParse({ ...validProfile, email });

      expectIssue(result, "email", "Please enter a valid email address");
    }
  );

  it("accepts a 254-character email and rejects 255", () => {
    const atLimit = profileSchema.safeParse({ ...validProfile, email: `${"a".repeat(249)}@b.co` });
    const overLimit = profileSchema.safeParse({ ...validProfile, email: `${"a".repeat(250)}@b.co` });

    expect(`${"a".repeat(249)}@b.co`).toHaveLength(254);
    expect(atLimit.success).toBe(true);
    expect(overLimit.success).toBe(false);
  });

  it("reports the dedicated message for an email longer than 254 characters", () => {
    const result = profileSchema.safeParse({ ...validProfile, email: `${"a".repeat(250)}@b.co` });

    expectIssue(result, "email", "Email is too long");
  });

  it.each(TIMEZONES.map((value) => ({ value })))("accepts the timezone $value", ({ value }) => {
    const result = profileSchema.safeParse({ ...validProfile, timezone: value });

    expect(result.success).toBe(true);
    expect(result.success && result.data.timezone).toBe(value);
  });

  it.each(["Mars/Olympus", "", "asia/ho_chi_minh", "Asia/Ho Chi Minh"])(
    "rejects %j as a timezone",
    (timezone) => {
      const result = profileSchema.safeParse({ ...validProfile, timezone });

      expectIssue(result, "timezone", "Timezone is not supported");
    }
  );

  it.each(LANGUAGE_VALUES.map((value) => ({ value })))("accepts the language $value", ({ value }) => {
    const result = profileSchema.safeParse({ ...validProfile, language: value });

    expect(result.success).toBe(true);
    expect(result.success && result.data.language).toBe(value);
  });

  it.each(["fr", "", "EN", "english"])("rejects %j as a language", (language) => {
    const result = profileSchema.safeParse({ ...validProfile, language });

    expectIssue(result, "language", "Language is not supported");
  });

  it.each(THEME_VALUES.map((value) => ({ value })))("accepts the theme $value", ({ value }) => {
    const result = profileSchema.safeParse({ ...validProfile, themePreference: value });

    expect(result.success).toBe(true);
    expect(result.success && result.data.themePreference).toBe(value);
  });

  it.each(["neon", "", "Dark", "auto"])("rejects %j as a theme preference", (themePreference) => {
    const result = profileSchema.safeParse({ ...validProfile, themePreference });

    expectIssue(result, "themePreference", "Theme preference is not supported");
  });

  it.each([
    "notificationEmailEnabled",
    "newsletterSubscribed",
    "twoFactorEnabled",
  ] as const)("rejects a string for the boolean %s", (field) => {
    const result = profileSchema.safeParse({ ...validProfile, [field]: "true" });

    expectIssue(result, field);
  });

  it.each([
    { field: "fullName", value: 12 },
    { field: "email", value: 12 },
    { field: "shopName", value: null },
    { field: "shopDescription", value: false },
  ] as const)("rejects a $field of the wrong type", ({ field, value }) => {
    const result = profileSchema.safeParse({ ...validProfile, [field]: value });

    expectIssue(result, field);
  });
});