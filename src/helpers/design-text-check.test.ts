import { describe, expect, it } from "vitest";

import { summarizeTextCheck } from "@/helpers/design-text-check";
import type { DesignTextCheck } from "@/types/batch-jobs";

const check = (overrides: Partial<DesignTextCheck>): DesignTextCheck => ({
  ok: true,
  expected: "Vintage Fishing Club",
  read: "VINTAGE / FISHING / CLUB",
  missing: [],
  extra: [],
  repeated: [],
  ...overrides,
});

describe("summarizeTextCheck", () => {
  it("shows nothing for a design that was not checked", () => {
    expect(summarizeTextCheck(undefined)).toBeNull();
    expect(summarizeTextCheck(null)).toBeNull();
  });

  it("says the text matches, with what OCR read for the tooltip", () => {
    expect(summarizeTextCheck(check({}))).toEqual({
      tone: "ok",
      label: "Text matches",
      detail: "",
      read: "OCR read: VINTAGE / FISHING / CLUB",
    });
  });

  it("lists what is missing, extra and repeated", () => {
    const summary = summarizeTextCheck(
      check({ ok: false, missing: ["FISHING"], extra: ["EST", "1952"], repeated: ["CLUB"], read: "VINTAGE / CLUB CLUB / EST 1952" })
    );

    expect(summary?.tone).toBe("warning");
    expect(summary?.label).toBe("Text may be wrong");
    expect(summary?.detail).toBe("missing FISHING; extra EST, 1952; repeated CLUB");
  });

  it("stays quiet for a picture design with no words, and warns when it has some", () => {
    expect(summarizeTextCheck(check({ expected: null, read: "" }))).toBeNull();

    const summary = summarizeTextCheck(check({ ok: false, expected: null, extra: ["SALE"], read: "SALE" }));
    expect(summary).toEqual({ tone: "warning", label: "Unexpected text", detail: "SALE", read: "OCR read: SALE" });
  });

  it("says when OCR read nothing", () => {
    expect(summarizeTextCheck(check({ ok: false, missing: ["VINTAGE", "FISHING", "CLUB"], read: "" }))?.read).toBe("OCR read no text");
  });
});
