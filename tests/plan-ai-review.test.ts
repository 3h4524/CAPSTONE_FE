import assert from "node:assert/strict";
import { test } from "node:test";

import { churnInsightsFor, formatPeriod, regenerateBlocker, scoreChange, sortActions } from "@/helpers/plan-ai-review";
import type { PlanAiAction, PlanAiChurnReason, PlanAiReviewResponse } from "@/types/plan-ai-review";

const reason = (pattern: string, confidence: PlanAiChurnReason["confidence"]): PlanAiChurnReason => ({
  pattern,
  evidence: "",
  confidence,
  metrics: [],
  hypothesis: null,
  howToConfirm: null,
});

const response = (overrides: Partial<PlanAiReviewResponse> = {}): PlanAiReviewResponse => ({
  isConfigured: true,
  isGenerating: false,
  latest: {
    id: "review-1",
    generatedAt: "2026-10-29T05:01:18Z",
    periodStart: "2026-08-01",
    periodEnd: "2026-10-29",
    model: "gemini-3.8-flash",
    mrrBridges: [],
    plans: [
      { key: "starter", name: "Starter", features: [] },
      { key: "studio", name: "Studio", features: [] },
    ],
    review: {
      plans: [
        {
          plan: "starter",
          status: "watch",
          score: 64,
          scoreReason: "",
          scoreMetrics: [],
          summary: "",
          summaryMetrics: [],
          outlook: { direction: "stable", reason: "", metrics: [] },
          strengths: [],
          risks: [],
          featureInsights: [],
          churnReasons: [reason("Linked to exports.", "medium"), reason("Linked to no core use.", "high")],
          churnNote: null,
          actions: [],
        },
        {
          plan: "studio",
          status: "healthy",
          score: 78,
          scoreReason: "",
          scoreMetrics: [],
          summary: "",
          summaryMetrics: [],
          outlook: { direction: "improving", reason: "", metrics: [] },
          strengths: [],
          risks: [],
          featureInsights: [],
          churnReasons: [],
          churnNote: "Churn patterns were not analysed: 7 customers stopped paying and 24 stayed in this period.",
          actions: [],
        },
      ],
      overall: "",
      overallMetrics: [],
    },
  },
  previousScores: [],
  nextRefreshAt: "2026-11-12T05:01:18Z",
  lastFailedAt: null,
  regenerateAvailableAt: null,
  ...overrides,
});

test("the Revenue page gets a plan's churn reasons by its name, the most certain first", () => {
  const starter = churnInsightsFor(response(), "Starter");

  assert.equal(starter?.period, "1 Aug – 29 Oct 2026");
  assert.deepEqual(
    starter?.plans.map((plan) => [plan.planKey, plan.reasons.map((item) => item.pattern)]),
    [["starter", ["Linked to no core use.", "Linked to exports."]]]
  );
});

test("all plans together list every plan, with the backend's note where churn was not analysed", () => {
  const all = churnInsightsFor(response(), null);

  assert.deepEqual(all?.plans.map((plan) => plan.planName), ["Starter", "Studio"]);
  assert.match(all?.plans[1].note ?? "", /not analysed/);
});

test("no churn insights for a plan the review does not cover, or before the first review", () => {
  assert.equal(churnInsightsFor(response(), "Vip"), null);
  assert.equal(churnInsightsFor(response({ latest: null }), "Starter"), null);
  assert.equal(churnInsightsFor(undefined, null), null);
});

test("a change since the last review names both statuses and both scores", () => {
  const previous = [{ plan: "starter", status: "healthy" as const, score: 78 }];

  assert.equal(scoreChange(previous, { plan: "starter", status: "watch", score: 64 }), "Healthy → Watch (78 → 64)");
  assert.equal(scoreChange(previous, { plan: "starter", status: "healthy", score: 80 }), "Healthy (78 → 80)");
  assert.equal(scoreChange(previous, { plan: "starter", status: "healthy", score: 78 }), null);
  assert.equal(scoreChange([], { plan: "starter", status: "watch", score: 64 }), null);
});

test("Regenerate is off while writing, during the cooldown and without a key", () => {
  const now = new Date("2026-10-29T06:00:00Z");

  assert.equal(regenerateBlocker(response(), now), null);
  assert.equal(regenerateBlocker(response({ isGenerating: true }), now), "A review is being written.");
  assert.equal(regenerateBlocker(response({ isConfigured: false }), now), "No Gemini key is set on the server.");
  assert.equal(
    regenerateBlocker(response({ regenerateAvailableAt: "2026-10-30T05:01:18Z" }), now),
    "Available again on 30 Oct 2026 at 05:01 UTC."
  );
  assert.equal(regenerateBlocker(response({ regenerateAvailableAt: "2026-10-29T05:00:00Z" }), now), null);
});

test("actions are listed high priority first and periods keep the year once", () => {
  const actions: PlanAiAction[] = [
    { text: "b", priority: "medium", kind: "change", metrics: [] },
    { text: "a", priority: "high", kind: "investigate", metrics: [] },
  ];

  assert.deepEqual(sortActions(actions).map((action) => action.text), ["a", "b"]);
  assert.equal(formatPeriod("2025-12-01", "2026-02-28"), "1 Dec 2025 – 28 Feb 2026");
});
