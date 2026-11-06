import type {
  DailyJobsPointDto,
  SystemStatisticsOverviewDto,
} from "@/types/system-statistics";

export type InsightSeverity = "critical" | "warning" | "info" | "positive";

/** Dashboard section an insight points at (matches the section element ids). */
export type InsightTarget = "pipeline" | "volume" | "integrations" | "errors";

export interface StatisticsInsight {
  id: string;
  severity: InsightSeverity;
  target: InsightTarget;
  title: string;
  detail: string;
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  positive: 3,
};

const formatNumber = (val: number) => new Intl.NumberFormat("en-US").format(val);

/** Parses a "yyyy-MM-dd" label as a local calendar date (new Date("yyyy-MM-dd") is UTC and shifts a day west of GMT). */
export function parseDateLabel(label: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(label);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatDateLabel(
  label: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  const date = parseDateLabel(label);
  return date ? new Intl.DateTimeFormat("en-US", options).format(date) : label;
}

const average = (points: DailyJobsPointDto[]) =>
  points.length === 0 ? 0 : points.reduce((sum, p) => sum + p.count, 0) / points.length;

/** 7-day trailing moving average; null until a full week of history exists. */
export function movingAverage(points: DailyJobsPointDto[], window = 7): (number | null)[] {
  return points.map((_, i) =>
    i < window - 1
      ? null
      : Math.round(average(points.slice(i - window + 1, i + 1)) * 10) / 10
  );
}

/**
 * Derives the narrative insights shown above the dashboard from the overview payload.
 * Ordered by severity so the most actionable finding is read first.
 */
export function buildStatisticsInsights(data: SystemStatisticsOverviewDto): StatisticsInsight[] {
  const insights: StatisticsInsight[] = [];
  const { metrics, integrationStatus, periodEnd } = data;
  const dailyJobs = data.dailyJobs ?? [];
  const pipelineStages = data.pipelineStages ?? [];
  const reliability = data.reliability as SystemStatisticsOverviewDto["reliability"] | undefined;
  if (!metrics || !integrationStatus) return insights;

  // 1. Publishing bottleneck: listings produced vs. listings that actually reached Etsy
  const listings = metrics.listingsGenerated.value;
  const etsyUploads = integrationStatus.etsyTotal;
  if (listings > 0 && etsyUploads === 0) {
    insights.push({
      id: "etsy-bottleneck",
      target: "integrations",
      severity: "critical",
      title: `${formatNumber(listings)} listings generated, none published to Etsy`,
      detail:
        "The pipeline stops before the marketplace: Etsy has no upload activity in this period. Check seller Etsy connections and the publish step.",
    });
  } else if (listings > 0) {
    const publishRate = (etsyUploads / listings) * 100;
    if (publishRate < 50) {
      insights.push({
        id: "etsy-low-publish",
      target: "integrations",
        severity: "warning",
        title: `Only ${publishRate.toFixed(1)}% of listings reach Etsy`,
        detail: `${formatNumber(etsyUploads)} Etsy uploads for ${formatNumber(listings)} generated listings.`,
      });
    }
  }

  // 2. Idle tail: the most recent days have no jobs at all
  let idleTail = 0;
  for (let i = dailyJobs.length - 1; i >= 0 && dailyJobs[i].count === 0; i--) idleTail++;
  const total = dailyJobs.reduce((sum, p) => sum + p.count, 0);
  if (total > 0 && idleTail >= 2) {
    const lastActive = dailyJobs[dailyJobs.length - 1 - idleTail];
    insights.push({
      id: "idle-tail",
      target: "volume",
      severity: "critical",
      title: `No batch jobs for the last ${idleTail} days`,
      detail: lastActive
        ? `Last activity on ${formatDateLabel(lastActive.dateLabel)} (${formatNumber(lastActive.count)} jobs). Verify the job queue and workers are running.`
        : "Verify the job queue and workers are running.",
    });
  }

  // 3. Growth gap between the top and the bottom of the funnel
  const imageGrowth = metrics.imagesGenerated.growthPercentage;
  const listingGrowth = metrics.listingsGenerated.growthPercentage;
  if (metrics.imagesGenerated.value > 0 && imageGrowth - listingGrowth >= 20) {
    insights.push({
      id: "growth-gap",
      target: "pipeline",
      severity: "warning",
      title: "Listing output is lagging image generation",
      detail: `Images grew ${imageGrowth > 0 ? "+" : ""}${imageGrowth}% but listings only ${listingGrowth > 0 ? "+" : ""}${listingGrowth}% vs the previous period, so more designs stall before becoming listings.`,
    });
  }

  // 4. Job reliability (absent when the API predates the reliability contract)
  if (reliability && reliability.finishedJobs > 0) {
    if (reliability.successRate < 95) {
      insights.push({
        id: "reliability",
        target: "errors",
        severity: reliability.successRate < 80 ? "critical" : "warning",
        title: `Job success rate is ${reliability.successRate}%`,
        detail: `${formatNumber(reliability.failedJobs)} failed and ${formatNumber(reliability.partiallyCompletedJobs)} partially completed out of ${formatNumber(reliability.finishedJobs)} finished jobs.`,
      });
    } else {
      insights.push({
        id: "reliability",
        target: "errors",
        severity: "positive",
        title: `Healthy job success rate: ${reliability.successRate}%`,
        detail: `${formatNumber(reliability.completedJobs)} of ${formatNumber(reliability.finishedJobs)} finished jobs completed fully.`,
      });
    }
  }

  // 5. Workload trend (first vs last full week of activity, excluding today's partial bucket)
  const activeDays = dailyJobs
    .slice(0, dailyJobs.length - idleTail)
    .filter((p) => p.dateLabel !== periodEnd);
  if (activeDays.length >= 14) {
    const firstWeek = average(activeDays.slice(0, 7));
    const lastWeek = average(activeDays.slice(-7));
    if (firstWeek > 0) {
      const change = ((lastWeek - firstWeek) / firstWeek) * 100;
      if (Math.abs(change) >= 10) {
        const projected = Math.round(lastWeek * dailyJobs.length);
        insights.push({
          id: "trend",
      target: "volume",
          severity: change > 0 ? "info" : "warning",
          title: `Daily workload ${change > 0 ? "up" : "down"} ${Math.abs(change).toFixed(0)}% across the period`,
          detail: `${lastWeek.toFixed(0)} jobs/day in the latest week vs ${firstWeek.toFixed(0)} in the first. At the current pace, the next ${dailyJobs.length} days would see about ${formatNumber(projected)} jobs.`,
        });
      }
    }
  }

  // 6. Throughput efficiency
  const jobs = metrics.totalBatchJobs.value;
  const assets = pipelineStages.reduce((sum, s) => sum + s.count, 0);
  if (jobs > 0 && assets > 0) {
    const costPart =
      reliability && reliability.totalCostUsd > 0
        ? ` AI cost averages $${(reliability.totalCostUsd / jobs).toFixed(2)} per job.`
        : "";
    insights.push({
      id: "efficiency",
      target: "pipeline",
      severity: "info",
      title: `${(assets / jobs).toFixed(1)} assets produced per batch job`,
      detail: `${formatNumber(assets)} assets from ${formatNumber(jobs)} jobs.${costPart}`,
    });
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
