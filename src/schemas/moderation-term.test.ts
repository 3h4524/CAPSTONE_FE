import { describe, expect, it } from "vitest";

import { matchTypeOf, moderationAllowlistSchema, moderationTermSchema } from "@/schemas/moderation-term";

const valid = {
  term: "nứng",
  category: "sexual",
  severity: "block",
  matchUnaccented: false,
  language: "vi",
  isActive: true,
  note: "",
};

describe("moderation term schema", () => {
  it("accepts a complete term", () => {
    expect(moderationTermSchema.safeParse(valid).success).toBe(true);
  });

  it("asks for a word and a known category", () => {
    const result = moderationTermSchema.safeParse({ ...valid, term: "   ", category: "weather" });

    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).toContain("Enter a word or phrase.");
    expect(messages).toContain("Choose a category.");
  });

  it("keeps a term and an allowlist phrase short", () => {
    expect(moderationTermSchema.safeParse({ ...valid, term: "x".repeat(101) }).success).toBe(false);
    expect(moderationAllowlistSchema.safeParse({ phrase: "x".repeat(201), isActive: true, note: "" }).success).toBe(false);
  });

  it("treats a term of several words as a phrase", () => {
    expect(matchTypeOf("bú cu")).toBe("phrase");
    expect(matchTypeOf("  nứng ")).toBe("word");
  });
});
