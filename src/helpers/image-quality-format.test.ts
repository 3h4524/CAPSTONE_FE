import { describe, expect, it } from "vitest";

import { IMAGE_EVAL_METRICS } from "@/constants/image-quality";
import {
  formatImageEvalDelta,
  formatImageEvalPValue,
  formatImageEvalValue,
  getImageEvalDeltaTone,
  isImageEvalSignificant,
} from "@/helpers/image-quality-format";
import type { ImageEvalMetricResult } from "@/types/admin-image-quality";

const getDefinition = (field: string) => {
  const definition = IMAGE_EVAL_METRICS.find((item) => item.field === field);
  if (!definition) {
    throw new Error(`Unknown metric ${field}`);
  }
  return definition;
};

const buildResult = (
  field: string,
  before: number | null,
  after: number | null
): ImageEvalMetricResult => ({
  definition: getDefinition(field),
  before: { value: before, yes: null, count: 8 },
  after: { value: after, yes: null, count: 8 },
  delta: before !== null && after !== null ? after - before : null,
  pValue: null,
});

describe("getImageEvalDeltaTone", () => {
  it.each([
    { field: "textOk", before: 0, after: 1, tone: "better" },
    { field: "textOk", before: 0.875, after: 0.75, tone: "worse" },
    { field: "cer", before: 0.67, after: 0.01, tone: "better" },
    { field: "cer", before: 0.1, after: 0.3, tone: "worse" },
    { field: "musiq", before: 68.31, after: 68.34, tone: "same" },
    { field: "musiq", before: null, after: 70, tone: "none" },
  ])("reads $field $before → $after as $tone", ({ field, before, after, tone }) => {
    expect(getImageEvalDeltaTone(buildResult(field, before, after))).toBe(tone);
  });
});

describe("formatImageEvalDelta", () => {
  it("shows rates in percentage points", () => {
    expect(formatImageEvalDelta(buildResult("textOk", 0.33, 1))).toBe("+67 pts");
  });

  it("shows means with the metric's decimals", () => {
    expect(formatImageEvalDelta(buildResult("cer", 0.671, 0.015))).toBe("−0.66");
  });

  it("says no change when the rounded change is zero", () => {
    expect(formatImageEvalDelta(buildResult("textClear", 0.875, 0.875))).toBe("no change");
  });
});

describe("formatImageEvalValue", () => {
  it("formats a rate as a percentage and a mean with its decimals", () => {
    const rate = buildResult("textOk", 0.75, 1);
    const mean = buildResult("topiqNr", 0.61671, 0.7230);

    expect(formatImageEvalValue(rate, rate.before)).toBe("75%");
    expect(formatImageEvalValue(mean, mean.before)).toBe("0.617");
  });
});

describe("formatImageEvalPValue", () => {
  it.each([
    { pValue: 0.000155, text: "p < 0.001" },
    { pValue: 0.0016887, text: "p = 0.002" },
    { pValue: 0.4667, text: "p = 0.47" },
    { pValue: null, text: "" },
  ])("formats $pValue as '$text'", ({ pValue, text }) => {
    expect(formatImageEvalPValue(pValue)).toBe(text);
  });
});

describe("isImageEvalSignificant", () => {
  it("draws the line at 0.05", () => {
    expect(isImageEvalSignificant(0.049)).toBe(true);
    expect(isImageEvalSignificant(0.05)).toBe(false);
    expect(isImageEvalSignificant(null)).toBe(false);
  });
});
