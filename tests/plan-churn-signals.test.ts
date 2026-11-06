import assert from "node:assert/strict";
import { test } from "node:test";

import { churnHeadline, coreUseLine, featureGaps, leaveGroupDescription, smallSampleNote } from "@/helpers/plan-churn-signals";
import type { FeatureChurnSignal, PlanChurnSignal } from "@/types/plan-insights";

const feature = (metric: string, stayedRate: number | null, leftRate: number | null, includedInPlan = true): FeatureChurnSignal => ({
  metric,
  label: metric,
  includedInPlan,
  stayedRate,
  leftRate,
  usageChangeBeforeLeaving: null,
  stayedFailureRate: null,
  leftFailureRate: null,
  stayedUsers: 10,
  leftUsers: 5,
});

const signal = (overrides: Partial<PlanChurnSignal> = {}): PlanChurnSignal => ({
  key: "starter",
  name: "Starter",
  stayed: 64,
  left: 35,
  minimumGroup: 10,
  hasEnoughData: true,
  leftInFirstMonthRate: null,
  leftWithoutCoreUseRate: 51.4,
  usageChangeBeforeLeaving: null,
  features: [feature("design", 76.6, 48.6), feature("videos", 67.2, 34.3), feature("ai", null, null), feature("lifestyle", 50, 10, false)],
  coreFeatures: ["Rendered mockups", "Design images"],
  leaveGroups: [],
  ...overrides,
});

test("every included feature with both shares is listed, the widest gap first", () => {
  assert.deepEqual(
    featureGaps(signal()).map((item) => [item.metric, item.gap]),
    [
      ["videos", 32.9],
      ["design", 28],
    ]
  );
});

test("the headline names the widest gap with both shares", () => {
  assert.equal(
    churnHeadline(signal()),
    "Customers who left used every feature less than those who stayed. The biggest gap is videos: 67.2% of those who stayed used it, against 34.3% of those who left."
  );
  assert.equal(churnHeadline(signal({ left: 0 })), "No customers stopped paying in this period.");
});

test("the core use line turns the share back into people", () => {
  assert.equal(coreUseLine(signal()), "51.4% of those who left (18 of 35) never used rendered mockups or design images.");
});

test("a group under the minimum gets a small-sample warning; enough data gets none", () => {
  assert.equal(smallSampleNote(signal()), null);
  assert.match(smallSampleNote(signal({ hasEnoughData: false, left: 7, stayed: 24 })) ?? "", /^Small sample: only 7 customers left and 24 stayed/);
});

test("the never-started group is described with the plan's own core features", () => {
  const group = { key: "never_started" as const, label: "Never got started", left: 18, leftRate: 51.4, stayed: 3, stayedRate: 4.7, notable: true };
  assert.equal(leaveGroupDescription(group, signal()), "Never used rendered mockups or design images, the plan's most used features.");
  assert.equal(leaveGroupDescription({ ...group, key: "steady" }, signal()), "None of these: the data does not show why they left.");
});
