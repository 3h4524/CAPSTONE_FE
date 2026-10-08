import { describe, expect, it } from "vitest";

import { MAX_MOCKUP_SELECTION, selectionLabel, sortMockupList } from "@/helpers/mockup-template";
import { buildMockupTemplate } from "@/test/factories";

describe("MAX_MOCKUP_SELECTION", () => {
  it("matches the apply-mockup schema limit", () => {
    expect(MAX_MOCKUP_SELECTION).toBe(5);
  });
});

describe("selectionLabel", () => {
  const cases: Array<[string, number, string]> = [
    ["zero", 0, "Select mock-ups"],
    ["one", 1, "1 mock-up selected"],
    ["two", 2, "2 mock-ups selected"],
    ["the maximum", MAX_MOCKUP_SELECTION, "5 mock-ups selected"],
    ["a count above the maximum", 6, "6 mock-ups selected"],
    ["a negative count", -1, "-1 mock-ups selected"],
    ["a non-integer count", 2.5, "2.5 mock-ups selected"],
  ];

  it.each(cases)("describes a selection of %s", (_label, count, expected) => {
    expect(selectionLabel(count)).toBe(expected);
  });
});

describe("sortMockupList", () => {
  it("orders by usage count descending", () => {
    const templates = [
      buildMockupTemplate({ id: "low", name: "Low", usageCount: 2 }),
      buildMockupTemplate({ id: "high", name: "High", usageCount: 40 }),
      buildMockupTemplate({ id: "mid", name: "Mid", usageCount: 11 }),
    ];

    expect(sortMockupList(templates).map((template) => template.id)).toEqual([
      "high",
      "mid",
      "low",
    ]);
  });

  it("breaks a usage count tie by name ascending", () => {
    const templates = [
      buildMockupTemplate({ id: "c", name: "Tote bag", usageCount: 3 }),
      buildMockupTemplate({ id: "a", name: "Ceramic mug", usageCount: 3 }),
      buildMockupTemplate({ id: "b", name: "Poster", usageCount: 3 }),
    ];

    expect(sortMockupList(templates).map((template) => template.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps the original order for fully equal entries", () => {
    const templates = [
      buildMockupTemplate({ id: "first", name: "Same", usageCount: 3 }),
      buildMockupTemplate({ id: "second", name: "Same", usageCount: 3 }),
    ];

    expect(sortMockupList(templates).map((template) => template.id)).toEqual(["first", "second"]);
  });

  it("does not mutate the input list", () => {
    const templates = [
      buildMockupTemplate({ id: "low", name: "Low", usageCount: 2 }),
      buildMockupTemplate({ id: "high", name: "High", usageCount: 40 }),
    ];

    sortMockupList(templates);

    expect(templates.map((template) => template.id)).toEqual(["low", "high"]);
  });

  it("returns an empty array for an empty list", () => {
    expect(sortMockupList([])).toEqual([]);
  });

  it("sorts a single element list unchanged", () => {
    const templates = [buildMockupTemplate({ id: "only", usageCount: 0 })];

    expect(sortMockupList(templates).map((template) => template.id)).toEqual(["only"]);
  });
});
