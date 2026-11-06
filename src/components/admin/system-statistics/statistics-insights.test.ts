import { describe, expect, it } from "vitest";

import type { SystemStatisticsOverviewDto } from "@/types/system-statistics";

import {
  buildStatisticsInsights,
  formatDateLabel,
  movingAverage,
  parseDateLabel,
} from "./statistics-insights";

const metric = (value: number, growthPercentage: number) => ({
  value,
  previousValue: 0,
  growthPercentage,
});

function makeOverview(overrides: Partial<SystemStatisticsOverviewDto> = {}): SystemStatisticsOverviewDto {
  // 20 days of steady 100 jobs/day, rising to 200/day over the final week
  const dailyJobs = Array.from({ length: 21 }, (_, i) => ({
    dateLabel: `2026-10-${String(i + 1).padStart(2, "0")}`,
    count: i < 7 ? 100 : i >= 13 ? 200 : 150,
  }));
  return {
    metrics: {
      totalBatchJobs: metric(3000, 40),
      imagesGenerated: metric(6000, 46.2),
      videosRendered: metric(1000, 38),
      listingsGenerated: metric(150, 11.7),
    },
    dailyJobs,
    pipelineStages: [
      { stageName: "Image Generation", count: 6000, percentage: 0 },
      { stageName: "Mock-up Rendering", count: 18000, percentage: 0 },
      { stageName: "Video Rendering", count: 1000, percentage: 0 },
      { stageName: "Listing Generation", count: 150, percentage: 0 },
    ],
    integrationStatus: {
      etsySuccessRate: 100,
      etsyTotal: 0,
      etsyGrowthPercentage: 0,
      printifySuccessRate: 100,
      printifyTotal: 0,
      printifyGrowthPercentage: 0,
      socialMediaSuccessRate: 100,
      socialMediaTotal: 0,
      socialMediaGrowthPercentage: 0,
      failedIntegrationsCount: 0,
    },
    recentErrors: [],
    reliability: {
      finishedJobs: 100,
      completedJobs: 90,
      partiallyCompletedJobs: 5,
      failedJobs: 5,
      successRate: 90,
      avgProcessingMinutes: 12,
      totalCostUsd: 300,
    },
    periodStart: "2026-10-01",
    periodEnd: "2026-10-21",
    ...overrides,
  };
}

describe("statistics-insights", () => {
  it("parses yyyy-MM-dd labels as local calendar dates", () => {
    const date = parseDateLabel("2026-10-03");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(3);
    expect(formatDateLabel("2026-10-03")).toBe("Oct 3");
    expect(parseDateLabel("not-a-date")).toBeNull();
  });

  it("computes a trailing 7-day moving average", () => {
    const points = Array.from({ length: 8 }, (_, i) => ({ dateLabel: `d${i}`, count: i + 1 }));
    const ma = movingAverage(points);
    expect(ma.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(ma[6]).toBe(4); // (1..7) / 7
    expect(ma[7]).toBe(5); // (2..8) / 7
  });

  it("flags listings that never reach Etsy as the top critical insight", () => {
    const insights = buildStatisticsInsights(makeOverview());
    expect(insights[0]).toMatchObject({ id: "etsy-bottleneck", severity: "critical" });
    expect(insights[0].title).toContain("150 listings");
  });

  it("reports the growth gap, reliability, trend and efficiency", () => {
    const ids = buildStatisticsInsights(makeOverview()).map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining(["growth-gap", "reliability", "trend", "efficiency"])
    );
  });

  it("projects the trend from the latest full week, excluding today", () => {
    const trend = buildStatisticsInsights(makeOverview()).find((i) => i.id === "trend");
    // first week 100/day, last full week (Oct 14-20) 200/day -> +100%, 200 x 21 days = 4,200
    expect(trend?.title).toBe("Daily workload up 100% across the period");
    expect(trend?.detail).toContain("4,200 jobs");
  });

  it("detects an idle tail of days without jobs", () => {
    const base = makeOverview();
    const dailyJobs = [
      ...base.dailyJobs,
      { dateLabel: "2026-10-22", count: 0 },
      { dateLabel: "2026-10-23", count: 0 },
    ];
    const insights = buildStatisticsInsights({ ...base, dailyJobs, periodEnd: "2026-10-23" });
    const idle = insights.find((i) => i.id === "idle-tail");
    expect(idle?.severity).toBe("critical");
    expect(idle?.title).toBe("No batch jobs for the last 2 days");
    expect(idle?.detail).toContain("Oct 21");
  });

  it("tolerates a payload from an older API without reliability fields", () => {
    const { reliability: _r, periodStart: _s, periodEnd: _e, ...legacy } = makeOverview();
    const insights = buildStatisticsInsights(legacy as SystemStatisticsOverviewDto);
    expect(insights.some((i) => i.id === "reliability")).toBe(false);
    expect(insights.find((i) => i.id === "efficiency")?.detail).not.toContain("AI cost");
  });

  it("does not raise the Etsy bottleneck once listings are being published", () => {
    const base = makeOverview();
    const insights = buildStatisticsInsights({
      ...base,
      integrationStatus: { ...base.integrationStatus, etsyTotal: 120 },
    });
    expect(insights.some((i) => i.id.startsWith("etsy"))).toBe(false);
  });
});
