import { describe, expect, it } from "vitest";

import { planBlocksRun } from "@/helpers/workflow-run-prepare";
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
