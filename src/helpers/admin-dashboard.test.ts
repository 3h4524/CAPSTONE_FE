import { describe, expect, it } from "vitest";

import {
  aiSummary,
  biggestDrop,
  bucketLabel,
  changeBadge,
  funnelSteps,
  percentChange,
  periodDays,
  statisticsWindow,
} from "@/helpers/admin-dashboard";

describe("statisticsWindow", () => {
  it("counts system statistics over the same window as each Dashboard period", () => {
    expect(statisticsWindow("Week")).toEqual({ timeRange: "7d", label: "Last 7 days" });
    expect(statisticsWindow("Month")).toEqual({ timeRange: "30d", label: "Last 30 days" });
    expect(statisticsWindow("HalfYear")).toEqual({ timeRange: "180d", label: "Last 6 months" });
    expect(statisticsWindow("Year")).toEqual({ timeRange: "year", label: "Last 12 months" });
  });
});

describe("changeBadge", () => {
  it("shows a rise as good and a fall as bad", () => {
    expect(changeBadge(12.345)).toEqual({ text: "+12.3%", tone: "emerald" });
    expect(changeBadge(-4)).toEqual({ text: "-4.0%", tone: "rose" });
  });

  it("flips the tone when lower is better", () => {
    expect(changeBadge(-4, true)).toEqual({ text: "-4.0%", tone: "emerald" });
  });

  it("calls a figure with nothing to compare against new, and no change neutral", () => {
    expect(changeBadge(null)).toEqual({ text: "New", tone: "sky" });
    expect(changeBadge(0)).toEqual({ text: "0%", tone: "slate" });
  });
});

describe("funnelSteps and biggestDrop", () => {
  const funnel = { products: 200, designed: 200, mockedUp: 190, listed: 10, published: 4 };

  it("gives each step its share of the products created and of the step before", () => {
    const steps = funnelSteps(funnel);

    expect(steps.map((step) => step.ofCreated)).toEqual([100, 100, 95, 5, 2]);
    expect(steps[3].fromPrevious).toBeCloseTo(5.26, 2);
  });

  it("names the step that loses the most products", () => {
    expect(biggestDrop(funnelSteps(funnel))).toMatchObject({
      from: "Mock-ups",
      to: "Listing copy",
      lost: 180,
    });
  });

  it("finds no drop when every product goes all the way", () => {
    expect(
      biggestDrop(funnelSteps({ products: 5, designed: 5, mockedUp: 5, listed: 5, published: 5 }))
    ).toBeNull();
  });
});

describe("aiSummary", () => {
  it("totals the calls and cost, prices a product and names a feature failing too often", () => {
    const summary = aiSummary(
      [
        { feature: "image_generation", calls: 100, failed: 6, costUsd: 40 },
        { feature: "listing", calls: 300, failed: 3, costUsd: 2 },
        { feature: "video", calls: 5, failed: 4, costUsd: 1 }, // too few calls to judge
      ],
      43
    );

    expect(summary).toMatchObject({ calls: 405, failed: 13, costUsd: 43, costPerProduct: 1 });
    expect(summary.worst).toMatchObject({ feature: "image_generation", failureRate: 6 });
  });

  it("names no feature when they all fail under 2%", () => {
    expect(aiSummary([{ feature: "listing", calls: 100, failed: 1, costUsd: 1 }], 0)).toMatchObject(
      {
        worst: null,
        costPerProduct: null,
      }
    );
  });
});

describe("bucketLabel and periodDays", () => {
  it("names a day and a month", () => {
    expect(bucketLabel("2026-11-02", "day")).toBe("Nov 2");
    expect(bucketLabel("2026-11-01", "month")).toBe("Nov 2026");
  });

  it("counts both ends of a period", () => {
    expect(periodDays("2026-10-29", "2026-11-04")).toBe(7);
  });
});

describe("percentChange", () => {
  it("is null when there was nothing before", () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(150, 100)).toBe(50);
  });
});
