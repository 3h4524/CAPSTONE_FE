import { describe, expect, it } from "vitest";

import { formatDate } from "@/utils/format-date";

describe("formatDate", () => {
  it("formats an ISO string as a medium date in English", () => {
    expect(formatDate("2026-12-13", "en")).toContain("Dec");
    expect(formatDate("2026-12-13", "en")).toContain("13");
    expect(formatDate("2026-12-13", "en")).toContain("2026");
  });

  it("formats an ISO string as a medium date in Vietnamese", () => {
    expect(formatDate("2026-12-13", "vi")).toContain("13");
    expect(formatDate("2026-12-13", "vi")).toContain("2026");
  });

  it.each(["", "not-a-date", "2026-13-40", "yesterday"])("returns an empty string for %s", (value) => {
    expect(formatDate(value, "en")).toBe("");
  });

  it("formats a Date object", () => {
    expect(formatDate(new Date("2026-12-13T00:00:00Z"), "en")).toContain("Dec");
    expect(formatDate(new Date("2026-12-13T00:00:00Z"), "en")).toContain("13");
  });

  it("keeps the calendar day regardless of the time component", () => {
    expect(formatDate("2026-12-13T23:30:00Z", "en")).toContain("13");
  });
});
