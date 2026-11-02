import { describe, expect, it } from "vitest";

import {
  catalogFeatures,
  featureLimit,
  hasFeature,
  isNodeLocked,
  PLAN_FEATURES,
  planIssues,
  readPlanFeature,
} from "@/helpers/plan-features";
import { planBlocksRun } from "@/helpers/workflow-run-prepare";
import type { Entitlements } from "@/types/subscription";

const entitlements = (overrides: Partial<Entitlements> = {}): Entitlements => ({
  hasPlan: true,
  planName: "Starter",
  tier: "starter",
  isTrial: false,
  trialEndsAt: null,
  maxBatchSize: 20,
  maxConcurrentJobs: 1,
  prioritySupport: false,
  features: [
    {
      code: "design_variations",
      label: "",
      kind: "limit",
      group: "",
      isEnabled: true,
      limitValue: 2,
    },
    {
      code: "auto_approval",
      label: "",
      kind: "flag",
      group: "",
      isEnabled: false,
      limitValue: null,
    },
  ],
  ...overrides,
});

describe("readPlanFeature", () => {
  it("reads a flag with no row as off and a limit with no row as no limit", () => {
    expect(readPlanFeature([], "ai_video")).toEqual({ isEnabled: false, limitValue: null });
    expect(readPlanFeature([], "daily_mockup_cap")).toEqual({ isEnabled: true, limitValue: null });
  });

  it("reads a stored row as is", () => {
    const features = [{ featureCode: "design_variations", isEnabled: true, limitValue: 4 }];

    expect(readPlanFeature(features, "design_variations")).toEqual({
      isEnabled: true,
      limitValue: 4,
    });
  });
});

describe("hasFeature and featureLimit", () => {
  it("answer from the Seller's entitlements", () => {
    expect(hasFeature(entitlements(), "auto_approval")).toBe(false);
    expect(featureLimit(entitlements(), "design_variations")).toBe(2);
  });

  it("treat entitlements that have not loaded as locked", () => {
    expect(hasFeature(undefined, "ai_video")).toBe(false);
    expect(featureLimit(undefined, "design_variations")).toBeUndefined();
  });
});

describe("planBlocksRun", () => {
  it("lets a run that fits the plan through", () => {
    expect(planBlocksRun(entitlements(), 20, 2, true)).toBeNull();
  });

  it("lets a Seller on Free run one product, leaving the rest to the allowances", () => {
    expect(planBlocksRun(entitlements({ hasPlan: false, maxBatchSize: 1 }), 1, 1, true)).toBeNull();
    expect(planBlocksRun(entitlements({ hasPlan: false, maxBatchSize: 1 }), 2, 1, true)).toMatch(/up to 1 at a time/);
  });

  it("stops a batch larger than the plan runs at once", () => {
    expect(planBlocksRun(entitlements(), 21, 1, true)).toMatch(/up to 20/);
  });

  it("ignores the batch size when the plan sets no limit", () => {
    expect(planBlocksRun(entitlements({ maxBatchSize: -1 }), 500, 1, true)).toBeNull();
  });

  it("stops more variations than the plan allows", () => {
    expect(planBlocksRun(entitlements(), 1, 3, true)).toMatch(/up to 2 variations/);
  });

  it("stops automatic approval when the plan does not include it", () => {
    expect(planBlocksRun(entitlements(), 1, 1, false)).toMatch(/Automatic design approval/);
  });
});

describe("planIssues", () => {
  it("locks Listing content on a plan without it, and Publish without publishing", () => {
    const starter = entitlements();

    expect(planIssues(starter, "generate-listing", {})[0].message).toMatch(/Listing content is part of Pro/);
    expect(planIssues(starter, "publish-etsy", {})[0].message).toMatch(/Publishing is part of Pro/);
    expect(planIssues(starter, "product-input", {})).toEqual([]);
  });

  it("locks the steps a plan does not include, and nothing while entitlements load", () => {
    const pro = entitlements({
      features: [{ code: "workflow_listing", label: "", kind: "flag", group: "", isEnabled: true, limitValue: null }],
    });

    expect(isNodeLocked(entitlements(), "generate-listing")).toBe(true);
    expect(isNodeLocked(pro, "generate-listing")).toBe(false);
    expect(isNodeLocked(entitlements(), "generate-video")).toBe(false);
    expect(isNodeLocked(undefined, "generate-listing")).toBe(false);
  });

  it("offers Standard Showcase when AI video is not in the plan", () => {
    const [issue] = planIssues(entitlements(), "generate-video", {
      mode: "ai_shot",
      outputFormat: "portrait",
    });

    expect(issue.fix?.patch).toEqual({ mode: "standard" });
  });

  it("offers portrait when landscape is not in the plan", () => {
    const [issue] = planIssues(entitlements(), "generate-video", {
      mode: "standard",
      outputFormat: "landscape",
    });

    expect(issue.fix?.patch).toEqual({ outputFormat: "portrait" });
  });

  it("caps the variants at the plan's limit", () => {
    const [issue] = planIssues(entitlements(), "design-image", { variants: 4 });

    expect(issue.fix?.patch).toEqual({ variants: 2 });
  });

  it("offers manual review when automatic approval is not in the plan", () => {
    const [issue] = planIssues(entitlements(), "design-approval", { mode: "auto" });

    expect(issue.fix?.patch).toEqual({ mode: "manual" });
  });

  it("finds nothing when the step fits the plan", () => {
    expect(planIssues(entitlements(), "design-image", { variants: 2 })).toEqual([]);
    expect(
      planIssues(entitlements(), "generate-video", { mode: "standard", outputFormat: "square" })
    ).toEqual([]);
  });
});

describe("catalogFeatures", () => {
  it("uses the definitions in code until the catalog loads", () => {
    expect(catalogFeatures(undefined)).toBe(PLAN_FEATURES);
    expect(catalogFeatures([])).toBe(PLAN_FEATURES);
  });

  it("takes labels, groups and order from the catalog and keeps the kind from code", () => {
    const features = catalogFeatures([
      { code: "ai_video", label: "Veo videos", description: "AI scenes", group: "Video tools", kind: "flag", unit: null, sortOrder: 1 },
      { code: "design_variations", label: "Variations", description: "", group: "Design", kind: "flag", unit: null, sortOrder: 2 },
    ]);

    expect(features[0]).toMatchObject({ code: "ai_video", label: "Veo videos", group: "Video tools" });
    expect(features[1]).toMatchObject({ code: "design_variations", label: "Variations", kind: "limit" });
    expect(features).toHaveLength(PLAN_FEATURES.length);
  });

  it("ignores codes the frontend does not know", () => {
    const features = catalogFeatures([
      { code: "video_generation", label: "Old", description: "", group: "Old", kind: "flag", unit: null, sortOrder: 0 },
    ]);

    expect(features.map((feature) => feature.code)).toEqual(PLAN_FEATURES.map((feature) => feature.code));
  });
});
