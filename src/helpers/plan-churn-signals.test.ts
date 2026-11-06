import { describe, expect, it } from "vitest";

import {
  churnHeadline,
  coreUseLine,
  featureGaps,
  leaveGroupDescription,
  smallSampleNote,
} from "@/helpers/plan-churn-signals";
import type { FeatureChurnSignal, LeaveGroup, PlanChurnSignal } from "@/types/plan-insights";

const feature = (label: string, stayedRate: number | null, leftRate: number | null, includedInPlan = true) =>
  ({ metric: label, label, stayedRate, leftRate, stayedUsers: 10, leftUsers: 5, includedInPlan }) as FeatureChurnSignal;

const signal = (overrides: Partial<PlanChurnSignal> = {}): PlanChurnSignal =>
  ({
    left: 5,
    stayed: 20,
    hasEnoughData: true,
    leftWithoutCoreUseRate: null,
    coreFeatures: [],
    features: [],
    ...overrides,
  }) as PlanChurnSignal;

describe("featureGaps", () => {
  it("keeps only included features both groups can be compared on, widest gap first", () => {
    const gaps = featureGaps(
      signal({
        features: [
          feature("Small", 50, 45),
          feature("Wide", 80.15, 20),
          feature("Excluded", 90, 10, false),
          feature("No data", null, 10),
        ],
      })
    );
    expect(gaps.map((x) => x.label)).toEqual(["Wide", "Small"]);
    expect(gaps[1].gap).toBe(5);
  });

  it("counts missing user numbers as none", () => {
    const missing = { ...feature("A", 10, 5), stayedUsers: undefined, leftUsers: undefined } as FeatureChurnSignal;
    expect(featureGaps(signal({ features: [missing] }))[0]).toMatchObject({ stayedUsers: 0, leftUsers: 0 });
  });
});

describe("churnHeadline", () => {
  it("says so when nobody left", () => {
    expect(churnHeadline(signal({ left: 0 }))).toBe("No customers stopped paying in this period.");
  });

  it("has nothing to say without a comparable feature", () => {
    expect(churnHeadline(signal())).toBeNull();
  });

  it("leads with every feature when all gaps are positive and names the widest", () => {
    const headline = churnHeadline(signal({ features: [feature("Video", 80, 20), feature("Mockups", 50, 40)] }));
    expect(headline).toContain("used every feature less");
    expect(headline).toContain("The biggest gap is Video: 80% of those who stayed");
  });

  it("speaks of most features when only some gaps are positive", () => {
    expect(churnHeadline(signal({ features: [feature("Video", 80, 20), feature("Mockups", 40, 50)] }))).toContain(
      "used most features less"
    );
  });

  it("names no gap when those who left used everything as much", () => {
    expect(churnHeadline(signal({ features: [feature("Video", 40, 50)] }))).toBe(
      "Customers who left used the features as much as those who stayed."
    );
  });
});

describe("coreUseLine", () => {
  it("turns the rate into people and lists the core features", () => {
    const line = coreUseLine(signal({ left: 10, leftWithoutCoreUseRate: 40, coreFeatures: ["Mockups", "Videos"] }));
    expect(line).toContain("40% of those who left (4 of 10) never used mockups or videos.");
  });

  it.each([
    { left: 0, leftWithoutCoreUseRate: 40, coreFeatures: ["Mockups"] },
    { left: 5, leftWithoutCoreUseRate: null, coreFeatures: ["Mockups"] },
    { left: 5, leftWithoutCoreUseRate: 40, coreFeatures: [] },
  ])("stays quiet with nothing to report: %o", (overrides) => {
    expect(coreUseLine(signal(overrides))).toBeNull();
  });
});

describe("leaveGroupDescription", () => {
  it("names the core features for those who never started", () => {
    const group = { key: "never_started" } as LeaveGroup;
    expect(leaveGroupDescription(group, signal({ coreFeatures: ["Mockups"] }))).toContain("Never used mockups,");
    expect(leaveGroupDescription(group, signal())).toBe("Never used the plan's main features.");
  });

  it.each([
    ["hit_failures", "At least 20%"],
    ["hit_limits", "daily cap"],
    ["faded", "at least 50% less"],
    ["steady", "None of these"],
  ])("describes %s", (key, text) => {
    expect(leaveGroupDescription({ key } as LeaveGroup, signal())).toContain(text);
  });
});

describe("smallSampleNote", () => {
  it("warns about a small sample, in the singular for one customer", () => {
    expect(smallSampleNote(signal({ hasEnoughData: false, left: 1, stayed: 2 }))).toContain(
      "only 1 customer left and 2 stayed"
    );
    expect(smallSampleNote(signal({ hasEnoughData: false, left: 3 }))).toContain("only 3 customers left");
  });

  it("stays quiet with enough data or nobody gone", () => {
    expect(smallSampleNote(signal())).toBeNull();
    expect(smallSampleNote(signal({ hasEnoughData: false, left: 0 }))).toBeNull();
  });
});
