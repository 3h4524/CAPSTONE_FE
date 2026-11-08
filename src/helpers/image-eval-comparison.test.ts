import { describe, expect, it } from "vitest";

import {
  compareImageEvalVersions,
  findImageEvalMetric,
  getDefaultImageEvalSelection,
  getImageEvalPresets,
  groupImageEvalMetrics,
} from "@/helpers/image-eval-comparison";
import { IMAGE_EVAL_RUN_FIXTURE } from "@/test/fixtures/image-eval-run";
import type { ImageEvalImage, ImageEvalVersion } from "@/types/admin-image-quality";

const buildVersion = (overrides: Partial<ImageEvalVersion>): ImageEvalVersion => ({
  key: "old",
  label: "Old prompt",
  provider: "ideogram",
  phase: "before",
  order: 0,
  imageCount: 0,
  ...overrides,
});

const buildImage = (overrides: Partial<ImageEvalImage>): ImageEvalImage => ({
  id: "image",
  version: "old",
  product: "Coffee",
  productType: "tshirt",
  expectedText: "Coffee",
  imageUrl: null,
  thumbnailUrl: null,
  ocrText: "",
  textOk: true,
  textOkOcr: true,
  textClear: true,
  note: "",
  cer: 0,
  layoutOk: true,
  notCut: true,
  centred: true,
  sizeOk: true,
  musiq: 70,
  topiqNr: 0.7,
  clipIqaPlus: 0.7,
  liqe: 4.5,
  laionAes: 5,
  clipOverall: 35,
  clipElements: 25,
  ...overrides,
});

const VERSIONS = [
  buildVersion({ key: "old", phase: "before", order: 0 }),
  buildVersion({ key: "new", phase: "after", order: 1 }),
  buildVersion({ key: "newer", phase: "after", order: 2 }),
  buildVersion({ key: "gemini", provider: "gemini", phase: "before", order: 0 }),
];

describe("getDefaultImageEvalSelection", () => {
  it("compares the same provider's old versions with every kept new version", () => {
    const selection = getDefaultImageEvalSelection(VERSIONS);

    expect(selection).toEqual({
      before: ["old"],
      after: ["new", "newer"],
      isSameProductsOnly: true,
      isNewestPerProduct: true,
    });
  });

  it("leaves dropped trials out of the after side", () => {
    const selection = getDefaultImageEvalSelection([
      ...VERSIONS,
      buildVersion({ key: "trial", phase: "trial", order: 3 }),
    ]);

    expect(selection.after).not.toContain("trial");
  });
});

describe("getImageEvalPresets", () => {
  it("offers one preset per before version", () => {
    const presets = getImageEvalPresets(VERSIONS);

    expect(presets.map((preset) => preset.selection.before)).toEqual([["old"], ["gemini"]]);
  });
});

describe("compareImageEvalVersions", () => {
  const images = [
    buildImage({ id: "a", version: "old", product: "Coffee", textOk: false }),
    buildImage({ id: "b", version: "old", product: "Camping", textOk: false }),
    buildImage({ id: "c", version: "new", product: "Coffee" }),
    buildImage({ id: "d", version: "newer", product: "Coffee" }),
    buildImage({ id: "e", version: "new", product: "Surf" }),
  ];

  it("keeps only products found on both sides", () => {
    const comparison = compareImageEvalVersions(images, VERSIONS, {
      before: ["old"],
      after: ["new", "newer"],
      isSameProductsOnly: true,
      isNewestPerProduct: false,
    });

    expect(comparison.products).toEqual(["Coffee"]);
    expect(comparison.beforeImages.map((image) => image.id)).toEqual(["a"]);
    expect(comparison.afterImages.map((image) => image.id)).toEqual(["c", "d"]);
  });

  it("keeps the newest after version of each product when asked", () => {
    const comparison = compareImageEvalVersions(images, VERSIONS, {
      before: ["old"],
      after: ["new", "newer"],
      isSameProductsOnly: false,
      isNewestPerProduct: true,
    });

    expect(comparison.afterImages.map((image) => image.id)).toEqual(["d", "e"]);
  });

  it("skips images that have no value for a metric", () => {
    const comparison = compareImageEvalVersions(
      [
        buildImage({ id: "a", version: "old", textOk: null, cer: null }),
        buildImage({ id: "b", version: "new", textOk: true, cer: 0.2 }),
      ],
      VERSIONS,
      { before: ["old"], after: ["new"], isSameProductsOnly: true, isNewestPerProduct: false }
    );

    const textOk = findImageEvalMetric(comparison, "textOk");
    expect(textOk?.before).toEqual({ value: null, yes: 0, count: 0 });
    expect(textOk?.pValue).toBeNull();
    expect(findImageEvalMetric(comparison, "cer")?.delta).toBeNull();
  });

  it("reproduces the report's Ideogram comparison from the real scores", () => {
    const comparison = compareImageEvalVersions(
      IMAGE_EVAL_RUN_FIXTURE.images,
      IMAGE_EVAL_RUN_FIXTURE.versions,
      getDefaultImageEvalSelection(IMAGE_EVAL_RUN_FIXTURE.versions)
    );

    const textOk = findImageEvalMetric(comparison, "textOk");
    const layoutOk = findImageEvalMetric(comparison, "layoutOk");
    const cer = findImageEvalMetric(comparison, "cer");
    expect(comparison.products).toHaveLength(4);
    expect(textOk?.before).toEqual({ value: 0, yes: 0, count: 8 });
    expect(textOk?.after).toEqual({ value: 1, yes: 8, count: 8 });
    expect(textOk?.pValue).toBeCloseTo(0.0001554, 6);
    expect(layoutOk?.pValue).toBeCloseTo(0.4667, 4);
    expect(cer?.before.value).toBeCloseTo(0.671, 3);
    expect(cer?.after.value).toBeCloseTo(0.015, 3);
  });
});

describe("groupImageEvalMetrics", () => {
  it("keeps the metric order inside each group", () => {
    const comparison = compareImageEvalVersions([], VERSIONS, {
      before: ["old"],
      after: ["new"],
      isSameProductsOnly: true,
      isNewestPerProduct: false,
    });

    const groups = groupImageEvalMetrics(comparison.metrics);

    expect(groups.map((group) => group.group)).toEqual(["text", "layout", "adherence", "quality"]);
    expect(groups[0]?.metrics.map((metric) => metric.definition.field)).toEqual([
      "textOk",
      "textOkOcr",
      "cer",
      "textClear",
    ]);
  });
});
