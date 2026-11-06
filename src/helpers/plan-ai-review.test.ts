import { describe, expect, it } from "vitest";

import {
  churnInsightsFor,
  featureName,
  formatDay,
  formatPeriod,
  planName,
  regenerateBlocker,
  scoreChange,
  sortActions,
  strongestReasons,
} from "@/helpers/plan-ai-review";
import type {
  PlanAiAction,
  PlanAiChurnReason,
  PlanAiReviewResponse,
  PlanAiReviewSnapshot,
  PlanAiScore,
} from "@/types/plan-ai-review";

const snapshot = {
  periodStart: "2026-08-01",
  periodEnd: "2026-10-29",
  plans: [{ key: "pro", name: "Pro", features: [{ key: "ai_video", name: "AI video" }] }],
  review: {
    plans: [
      { plan: "pro", churnReasons: [{ confidence: "low" }, { confidence: "high" }], churnNote: null },
      { plan: "starter", churnReasons: [], churnNote: "Too few customers left." },
      { plan: "vip", churnReasons: [], churnNote: null },
    ],
  },
} as unknown as PlanAiReviewSnapshot;

const response = (overrides: Partial<PlanAiReviewResponse> = {}) =>
  ({ isConfigured: true, isGenerating: false, regenerateAvailableAt: null, ...overrides }) as PlanAiReviewResponse;

const score = (status: PlanAiScore["status"], value: number | null) =>
  ({ plan: "pro", status, score: value }) as PlanAiScore;

describe("dates", () => {
  it("formats a day from a date or timestamp", () => {
    expect(formatDay("2026-08-01T09:00:00Z")).toBe("1 Aug 2026");
  });

  it("drops the first year only when both ends share it", () => {
    expect(formatPeriod("2026-08-01", "2026-10-29")).toBe("1 Aug – 29 Oct 2026");
    expect(formatPeriod("2025-12-20", "2026-01-10")).toBe("20 Dec 2025 – 10 Jan 2026");
  });
});

describe("ordering", () => {
  it("puts the most urgent action first without changing the input", () => {
    const actions = [{ priority: "low" }, { priority: "high" }, { priority: "medium" }] as PlanAiAction[];
    expect(sortActions(actions).map((x) => x.priority)).toEqual(["high", "medium", "low"]);
    expect(actions[0].priority).toBe("low");
  });

  it("puts the most certain churn reason first and accepts none", () => {
    const reasons = [{ confidence: "medium" }, { confidence: "high" }] as PlanAiChurnReason[];
    expect(strongestReasons(reasons).map((x) => x.confidence)).toEqual(["high", "medium"]);
    expect(strongestReasons(undefined)).toEqual([]);
  });
});

describe("names", () => {
  it("falls back to the key for what the snapshot does not know", () => {
    expect(planName(snapshot, "pro")).toBe("Pro");
    expect(planName(snapshot, "gone")).toBe("gone");
    expect(featureName(snapshot, "pro", "ai_video")).toBe("AI video");
    expect(featureName(snapshot, "pro", "gone")).toBe("gone");
    expect(featureName(snapshot, "gone", "ai_video")).toBe("ai_video");
  });
});

describe("scoreChange", () => {
  it("is null with no earlier review or no change", () => {
    expect(scoreChange([], score("watch", 60))).toBeNull();
    expect(scoreChange([score("watch", 60)], score("watch", 60))).toBeNull();
  });

  it("shows a status and score change", () => {
    expect(scoreChange([score("watch", 64)], score("at_risk", 49))).toBe("Watch → At risk (64 → 49)");
  });

  it("shows only the score when the status held", () => {
    expect(scoreChange([score("watch", 64)], score("watch", 60))).toBe("Watch (64 → 60)");
  });

  it("leaves out a score that is missing on one side", () => {
    expect(scoreChange([score("not_enough_data", null)], score("healthy", 80))).toBe("Not enough data → Healthy");
  });
});

describe("churnInsightsFor", () => {
  it("is null without a review", () => {
    expect(churnInsightsFor(undefined, null)).toBeNull();
    expect(churnInsightsFor(response({ latest: null }), null)).toBeNull();
  });

  it("lists every plan with reasons or a note, the strongest reason first", () => {
    const insights = churnInsightsFor(response({ latest: snapshot }), null);
    expect(insights?.period).toBe("1 Aug – 29 Oct 2026");
    expect(insights?.plans.map((x) => x.planKey)).toEqual(["pro", "starter"]);
    expect(insights?.plans[0].reasons[0].confidence).toBe("high");
  });

  it("narrows to one plan by display name", () => {
    expect(churnInsightsFor(response({ latest: snapshot }), "Pro")?.plans).toHaveLength(1);
    expect(churnInsightsFor(response({ latest: snapshot }), "Unknown")).toBeNull();
  });
});

describe("regenerateBlocker", () => {
  const now = new Date("2026-11-03T10:00:00Z");

  it("explains each reason the button is off, in order", () => {
    expect(regenerateBlocker(response({ isConfigured: false, isGenerating: true }), now)).toBe(
      "No Gemini key is set on the server."
    );
    expect(regenerateBlocker(response({ isGenerating: true }), now)).toBe("A review is being written.");
    expect(regenerateBlocker(response({ regenerateAvailableAt: "2026-11-04T08:30:00Z" }), now)).toContain(
      "Available again on 4 Nov 2026 at 08:30 UTC"
    );
  });

  it("allows it once the wait is over", () => {
    expect(regenerateBlocker(response({ regenerateAvailableAt: "2026-11-03T09:00:00Z" }), now)).toBeNull();
    expect(regenerateBlocker(response(), now)).toBeNull();
  });
});
