import { describe, expect, it } from "vitest";

import { addSystemApiKeySchema, systemApiKeyProviderSchema, toLimit } from "@/schemas/admin-system-api-keys";

describe("addSystemApiKeySchema", () => {
  it("takes a named key for a known provider, trimmed", () => {
    const parsed = addSystemApiKeySchema.parse({ provider: "minimax", label: " Video ", key: " sk-1234567890 " });

    expect(parsed).toEqual({ provider: "minimax", label: "Video", key: "sk-1234567890" });
  });

  it("refuses a provider the platform has no keys for, a missing name and a cut-off key", () => {
    expect(addSystemApiKeySchema.safeParse({ provider: "openai", label: "x", key: "sk-1234567890" }).success).toBe(false);
    expect(addSystemApiKeySchema.safeParse({ provider: "ideogram", label: "  ", key: "sk-1234567890" }).success).toBe(false);
    expect(addSystemApiKeySchema.safeParse({ provider: "ideogram", label: "Main", key: "abc" }).success).toBe(false);
  });
});

describe("systemApiKeyProviderSchema", () => {
  it("takes whole numbers in range, or an empty box for no limit", () => {
    expect(systemApiKeyProviderSchema.safeParse({ dailyLimitPerKey: "500", maxConcurrentPerKey: "", strategy: "rotate" }).success).toBe(true);
    expect(systemApiKeyProviderSchema.safeParse({ dailyLimitPerKey: "0", maxConcurrentPerKey: "8", strategy: "fill" }).success).toBe(true);
  });

  it("refuses fractions, negatives, no slot at a time and an unknown order", () => {
    expect(systemApiKeyProviderSchema.safeParse({ dailyLimitPerKey: "1.5", maxConcurrentPerKey: "", strategy: "fill" }).success).toBe(false);
    expect(systemApiKeyProviderSchema.safeParse({ dailyLimitPerKey: "-1", maxConcurrentPerKey: "", strategy: "fill" }).success).toBe(false);
    expect(systemApiKeyProviderSchema.safeParse({ dailyLimitPerKey: "", maxConcurrentPerKey: "0", strategy: "fill" }).success).toBe(false);
    expect(systemApiKeyProviderSchema.safeParse({ dailyLimitPerKey: "", maxConcurrentPerKey: "", strategy: "random" }).success).toBe(false);
  });

  it("turns an empty box into no limit", () => {
    expect([toLimit(""), toLimit(" "), toLimit("8")]).toEqual([null, null, 8]);
  });
});
