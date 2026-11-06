import { describe, expect, it } from "vitest";

import type { SellerOpportunity } from "@/api/market-opportunities";
import {
  buildDashboardCsv,
  buildKpiSparklines,
  countInProgress,
  describeActionItem,
  describeAiFeature,
  describeAllowanceState,
  describeChange,
  describeGreeting,
  describeWaiting,
  formatUsd,
  pickTopOpportunities,
  splitActionItems,
} from "@/helpers/seller-dashboard";
import type {
  ActionItem,
  DashboardSummary,
  PipelineStage,
  TrendPoint,
} from "@/types/seller-dashboard";

const day = (date: string, overrides: Partial<TrendPoint> = {}): TrendPoint => ({
  date,
  products: 0,
  finished: 0,
  failed: 0,
  costUsd: 0,
  ...overrides,
});

describe("buildKpiSparklines", () => {
  it("carries the success rate over days when nothing finished", () => {
    const sparklines = buildKpiSparklines([
      day("2026-11-01", { products: 3, finished: 4, failed: 1, costUsd: 0.2 }),
      day("2026-11-02"),
      day("2026-11-03", { products: 1, finished: 2, failed: 2 }),
    ]);
    expect(sparklines.products).toEqual([3, 0, 1]);
    expect(sparklines.successRate).toEqual([75, 75, 0]);
    expect(sparklines.cost).toEqual([0.2, 0, 0]);
  });
});

describe("describeAiFeature", () => {
  it("names known features and tidies unknown ones", () => {
    expect(describeAiFeature("image_generation")).toBe("Design images");
    expect(describeAiFeature("new_thing")).toBe("new thing");
  });
});

describe("buildDashboardCsv", () => {
  it("writes the KPIs and then one row per day, quoting text with commas", () => {
    const kpi = { value: 51, previousValue: 21, changePercent: 142.9 };
    const csv = buildDashboardCsv({
      periodDays: 7,
      kpis: {
        productsCreated: kpi,
        successRatePercent: kpi,
        listingsPublished: { value: 0, previousValue: 0, changePercent: null },
        costPerProductUsd: kpi,
      },
      trend: [day("2026-11-03", { products: 2, finished: 1, failed: 1, costUsd: 0.14 })],
    } as DashboardSummary).split("\n");

    expect(csv[0]).toBe("Metric,Last 7 days,Previous period,Change %");
    expect(csv[3]).toBe("Listings published,0,0,");
    expect(csv.at(-1)).toBe("2026-11-03,2,1,1,0.14");
  });
});

const item = (overrides: Partial<ActionItem> = {}): ActionItem => ({
  type: "design_review",
  severity: "warning",
  count: 62,
  priority: 130,
  oldestAt: null,
  actionUrl: "/batches",
  targets: [],
  ...overrides,
});

describe("describeActionItem", () => {
  it("pluralises by count", () => {
    expect(describeActionItem(item())).toBe("62 designs wait for your review");
    expect(describeActionItem(item({ count: 1 }))).toBe("1 design waits for your review");
  });
});

describe("describeWaiting", () => {
  const now = new Date("2026-11-03T10:00:00Z");

  it("reads hours under a day and days after", () => {
    expect(describeWaiting("2026-11-03T09:30:00Z", now)).toBe("just now");
    expect(describeWaiting("2026-11-03T05:00:00Z", now)).toBe("waiting 5 hours");
    expect(describeWaiting("2026-09-26T10:00:00Z", now)).toBe("waiting 38 days");
  });

  it("says nothing when the wait is unknown", () => {
    expect(describeWaiting(null, now)).toBeNull();
  });
});

describe("describeGreeting", () => {
  it("counts the urgent items apart", () => {
    expect(describeGreeting([])).toBe("Nothing needs you right now.");
    expect(describeGreeting([item(), item({ severity: "error", type: "video_failed" })])).toBe(
      "2 things need you today, 1 of them urgent."
    );
  });
});

describe("describeChange", () => {
  it("shows a rise as good unless lower is better", () => {
    const rise = { value: 65, previousValue: 58, changePercent: 12.1 };
    expect(describeChange(rise)).toEqual({ text: "+12.1%", tone: "good" });
    expect(describeChange(rise, true)).toEqual({ text: "+12.1%", tone: "bad" });
  });

  it("has nothing to show without an earlier period", () => {
    expect(describeChange({ value: 3, previousValue: 0, changePercent: null })).toBeNull();
  });
});

describe("countInProgress", () => {
  it("leaves out the products that are ready or published", () => {
    const stages: PipelineStage[] = [
      { stage: "queued", count: 3, stuckCount: 0 },
      { stage: "design_review", count: 12, stuckCount: 0 },
      { stage: "ready", count: 40, stuckCount: 0 },
      { stage: "published", count: 5, stuckCount: 0 },
    ];
    expect(countInProgress(stages)).toBe(15);
  });
});

describe("splitActionItems", () => {
  it("puts failures to fix apart from work to review", () => {
    const { fixNow, toReview } = splitActionItems([
      item({ type: "batch_failed", severity: "error" }),
      item({ type: "etsy_reconnect", severity: "critical" }),
      item(),
      item({ type: "low_seo", severity: "info" }),
    ]);
    expect(fixNow.map((entry) => entry.type)).toEqual(["batch_failed", "etsy_reconnect"]);
    expect(toReview.map((entry) => entry.type)).toEqual(["design_review", "low_seo"]);
  });
});

describe("describeAllowanceState", () => {
  it("flags a used-up allowance apart from one close to its limit", () => {
    expect(describeAllowanceState(17, 7)).toBe("over");
    expect(describeAllowanceState(4, 5)).toBe("near");
    expect(describeAllowanceState(2, 5)).toBe("ok");
  });
});

describe("pickTopOpportunities", () => {
  const opportunity = (
    id: string,
    rank: number | null,
    finalScore: number,
    state: SellerOpportunity["state"] = "new"
  ) => ({ id, rank, finalScore, state }) as SellerOpportunity;

  it("keeps the untouched niches in rank order, then by score", () => {
    const picked = pickTopOpportunities(
      [
        opportunity("saved", 1, 99, "saved"),
        opportunity("third", null, 90),
        opportunity("second", 3, 50),
        opportunity("first", 2, 40),
        opportunity("fourth", null, 10),
      ],
      3
    );
    expect(picked.map((item) => item.id)).toEqual(["first", "second", "third"]);
  });
});

describe("formatUsd", () => {
  it("keeps a third decimal for cents-level costs", () => {
    expect(formatUsd(0.0662)).toBe("$0.066");
    expect(formatUsd(12.4)).toBe("$12.40");
  });
});
