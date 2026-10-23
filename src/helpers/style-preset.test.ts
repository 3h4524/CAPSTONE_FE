import { describe, expect, it } from "vitest";

import {
  fromRecommendationLines,
  sortPresetList,
  toRecommendationLines,
} from "@/helpers/style-preset";
import { buildStylePreset } from "@/test/factories";

describe("toRecommendationLines", () => {
  it("joins the recommendations with newlines", () => {
    expect(toRecommendationLines(["Keep it light", "Avoid harsh shadows"])).toBe(
      "Keep it light\nAvoid harsh shadows"
    );
  });

  it("returns an empty string for an empty list", () => {
    expect(toRecommendationLines([])).toBe("");
  });

  it("keeps blank entries as blank lines", () => {
    expect(toRecommendationLines(["first", "", "third"])).toBe("first\n\nthird");
  });

  it("does not trim or transform the entries", () => {
    expect(toRecommendationLines(["  padded  "])).toBe("  padded  ");
  });

  it("does not mutate the input array", () => {
    const recommendations = ["first", "second"];

    toRecommendationLines(recommendations);

    expect(recommendations).toEqual(["first", "second"]);
  });
});

describe("fromRecommendationLines", () => {
  const cases: Array<[string, string, string[]]> = [
    ["a single line", "Keep it light", ["Keep it light"]],
    ["two lines", "first\nsecond", ["first", "second"]],
    ["windows line endings", "first\r\nsecond", ["first", "second"]],
    ["blank lines between entries", "first\n\n\nsecond", ["first", "second"]],
    ["padded lines", "  first  \n\tsecond\t", ["first", "second"]],
    ["an empty string", "", []],
    ["a newline-only string", "\n\n", []],
    ["a whitespace-only string", "   \n\t", []],
  ];

  it.each(cases)("splits %s", (_label, value, expected) => {
    expect(fromRecommendationLines(value)).toEqual(expected);
  });

  it("keeps an intentional leading space inside a line", () => {
    expect(fromRecommendationLines("  indented")).toEqual(["indented"]);
  });

  it("round-trips the output of toRecommendationLines", () => {
    const recommendations = ["Keep it light", "", "Avoid harsh shadows"];

    expect(fromRecommendationLines(toRecommendationLines(recommendations))).toEqual([
      "Keep it light",
      "Avoid harsh shadows",
    ]);
  });
});

describe("sortPresetList", () => {
  it("orders by usage count descending", () => {
    const presets = [
      buildStylePreset({ id: "low", name: "Low", usageCount: 1 }),
      buildStylePreset({ id: "high", name: "High", usageCount: 30 }),
      buildStylePreset({ id: "mid", name: "Mid", usageCount: 10 }),
    ];

    expect(sortPresetList(presets).map((preset) => preset.id)).toEqual(["high", "mid", "low"]);
  });

  it("breaks a usage count tie by name ascending", () => {
    const presets = [
      buildStylePreset({ id: "c", name: "Charcoal", usageCount: 5 }),
      buildStylePreset({ id: "a", name: "Amber", usageCount: 5 }),
      buildStylePreset({ id: "b", name: "blue", usageCount: 5 }),
    ];

    expect(sortPresetList(presets).map((preset) => preset.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps the original order for fully equal entries", () => {
    const presets = [
      buildStylePreset({ id: "first", name: "Same", usageCount: 5 }),
      buildStylePreset({ id: "second", name: "Same", usageCount: 5 }),
      buildStylePreset({ id: "third", name: "Same", usageCount: 5 }),
    ];

    expect(sortPresetList(presets).map((preset) => preset.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("does not mutate the input list", () => {
    const presets = [
      buildStylePreset({ id: "low", name: "Low", usageCount: 1 }),
      buildStylePreset({ id: "high", name: "High", usageCount: 30 }),
    ];

    sortPresetList(presets);

    expect(presets.map((preset) => preset.id)).toEqual(["low", "high"]);
  });

  it.each([
    ["an empty list", []],
    ["a single preset", [buildStylePreset({ id: "only" })]],
    [
      "presets with a zero usage count",
      [
        buildStylePreset({ id: "b", name: "B", usageCount: 0 }),
        buildStylePreset({ id: "a", name: "A", usageCount: 0 }),
      ],
    ],
  ] as Array<[string, ReturnType<typeof buildStylePreset>[]]>)("handles %s", (_label, presets) => {
    expect(sortPresetList(presets)).toHaveLength(presets.length);
  });

  it("handles a negative usage count as the least used", () => {
    const presets = [
      buildStylePreset({ id: "negative", name: "Negative", usageCount: -5 }),
      buildStylePreset({ id: "zero", name: "Zero", usageCount: 0 }),
    ];

    expect(sortPresetList(presets).map((preset) => preset.id)).toEqual(["zero", "negative"]);
  });
});
