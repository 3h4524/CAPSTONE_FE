import { describe, expect, it } from "vitest";

import { failedProductsBlockRun, needsOwnImageKey, planBlocksRun, productLineBlocksRun } from "@/helpers/workflow-run-prepare";
import type { Entitlements } from "@/types/subscription";

const entitlements = (
  maxBatchSize: number,
  features: { code: string; isEnabled: boolean; limitValue?: number | null }[] = []
) => ({ maxBatchSize, features }) as unknown as Entitlements;

describe("planBlocksRun", () => {
  it("lets through a run the plan allows", () => {
    const plan = entitlements(10, [
      { code: "design_variations", isEnabled: true, limitValue: 2 },
      { code: "auto_approval", isEnabled: true },
    ]);
    expect(planBlocksRun(plan, 10, 2, false)).toBeNull();
  });

  it("refuses more products than the plan runs at a time", () => {
    expect(planBlocksRun(entitlements(10), 11, 1, true)).toContain("This run has 11 products");
  });

  it("treats a negative batch size as no limit", () => {
    expect(planBlocksRun(entitlements(-1), 5000, 1, true)).toBeNull();
  });

  it("refuses too many variations, in the singular for one", () => {
    const one = entitlements(10, [{ code: "design_variations", isEnabled: true, limitValue: 1 }]);
    expect(planBlocksRun(one, 1, 2, true)).toContain("up to 1 variation per product");

    const two = entitlements(10, [{ code: "design_variations", isEnabled: true, limitValue: 2 }]);
    expect(planBlocksRun(two, 1, 3, true)).toContain("up to 2 variations per product");
  });

  it("does not cap variations a plan leaves unlimited", () => {
    const plan = entitlements(10, [{ code: "design_variations", isEnabled: true, limitValue: null }]);
    expect(planBlocksRun(plan, 1, 50, true)).toBeNull();
  });

  it("needs automatic approval to skip review", () => {
    expect(planBlocksRun(entitlements(10), 1, 1, false)).toContain("Automatic design approval is part of Pro");
    expect(planBlocksRun(entitlements(10), 1, 1, true)).toBeNull();
  });
});

describe("failedProductsBlockRun", () => {
  const products = (...statuses: string[]) => statuses.map((status) => ({ status }));

  it("stops a run whose products all failed or were made, instead of going on to the video", () => {
    expect(failedProductsBlockRun(products("failed", "failed", "approved"))).toBe(
      "2 products of this batch failed in an earlier run, so they have no design yet. Open that run under Previous runs in Product input, then choose Retry failed products in Design image."
    );
    expect(failedProductsBlockRun(products("failed"))).toContain("1 product of this batch failed in an earlier run, so it has no design yet.");
  });

  it("lets the run make the pending products, and leaves a batch with nothing failed alone", () => {
    expect(failedProductsBlockRun(products("pending", "failed"))).toBeNull();
    expect(failedProductsBlockRun(products("approved", "image_review_required"))).toBeNull();
    expect(failedProductsBlockRun([])).toBeNull();
  });
});

describe("productLineBlocksRun", () => {
  const tee = { name: "Surf tee", productType: "tshirt" as const };
  const hoodie = { name: "Surf hoodie", productType: "hoodie" as const };

  it("runs T-shirts and hoodies together at a ratio that suits apparel", () => {
    expect(productLineBlocksRun("apparel", "3:4", [tee, hoodie])).toBeNull();
  });

  it("refuses a batch without a product line", () => {
    expect(productLineBlocksRun(null, "1:1", [tee])).toContain("no product line");
  });

  it("names the pending products of another line", () => {
    expect(productLineBlocksRun("apparel", "3:4", [tee, { name: "Surf mug", productType: "mug" }])).toContain("Surf mug is not");
  });

  it("refuses a design ratio the line cannot print", () => {
    expect(productLineBlocksRun("phone_cases", "16:9", [{ name: "Case", productType: "phone_case" }])).toContain("Choose 9:16");
  });
});

describe("needsOwnImageKey", () => {
  const platformKeys = entitlements(10, [{ code: "system_image_keys", isEnabled: true }]);

  it("lets a plan with the platform's keys make Ideogram images without a key of the Seller's", () => {
    expect(needsOwnImageKey(platformKeys, "ideogram")).toBe(false);
  });

  it("still needs the Seller's key for Gemini, or without the feature", () => {
    expect(needsOwnImageKey(platformKeys, "gemini")).toBe(true);
    expect(needsOwnImageKey(entitlements(10), "ideogram")).toBe(true);
  });
});
