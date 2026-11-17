import { getCurrentLocale, i18n } from "@/i18n/client";
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

const dateTimeLocale = () => (getCurrentLocale() === "vi" ? "vi-VN" : "en-US");

const formatNumber = (val: number) => new Intl.NumberFormat(dateTimeLocale()).format(val);

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
  return date ? new Intl.DateTimeFormat(dateTimeLocale(), options).format(date) : label;
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
      title: i18n.t("admin.statistics.insights.etsyBottleneck.title", {
        listings: formatNumber(listings),
      }),
      detail: i18n.t("admin.statistics.insights.etsyBottleneck.detail"),
    });
  } else if (listings > 0) {
    const publishRate = (etsyUploads / listings) * 100;
    if (publishRate < 50) {
      insights.push({
        id: "etsy-low-publish",
        target: "integrations",
        severity: "warning",
        title: i18n.t("admin.statistics.insights.etsyLowPublish.title", {
          rate: publishRate.toFixed(1),
        }),
        detail: i18n.t("admin.statistics.insights.etsyLowPublish.detail", {
          uploads: formatNumber(etsyUploads),
          listings: formatNumber(listings),
        }),
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
      title: i18n.t("admin.statistics.insights.idleTail.title", { count: idleTail }),
      detail: lastActive
        ? i18n.t("admin.statistics.insights.idleTail.detailWithActivity", {
            date: formatDateLabel(lastActive.dateLabel),
            count: formatNumber(lastActive.count),
          })
        : i18n.t("admin.statistics.insights.idleTail.noActivityDetail"),
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
      title: i18n.t("admin.statistics.insights.growthGap.title"),
      detail: i18n.t("admin.statistics.insights.growthGap.detail", {
        imageGrowth: `${imageGrowth > 0 ? "+" : ""}${imageGrowth}`,
        listingGrowth: `${listingGrowth > 0 ? "+" : ""}${listingGrowth}`,
      }),
    });
  }

  // 4. Job reliability (absent when the API predates the reliability contract)
  if (reliability && reliability.finishedJobs > 0) {
    if (reliability.successRate < 95) {
      insights.push({
        id: "reliability",
        target: "errors",
        severity: reliability.successRate < 80 ? "critical" : "warning",
        title: i18n.t("admin.statistics.insights.reliability.lowTitle", {
          rate: reliability.successRate,
        }),
        detail: i18n.t("admin.statistics.insights.reliability.lowDetail", {
          failed: formatNumber(reliability.failedJobs),
          partial: formatNumber(reliability.partiallyCompletedJobs),
          finished: formatNumber(reliability.finishedJobs),
        }),
      });
    } else {
      insights.push({
        id: "reliability",
        target: "errors",
        severity: "positive",
        title: i18n.t("admin.statistics.insights.reliability.healthyTitle", {
          rate: reliability.successRate,
        }),
        detail: i18n.t("admin.statistics.insights.reliability.healthyDetail", {
          completed: formatNumber(reliability.completedJobs),
          finished: formatNumber(reliability.finishedJobs),
        }),
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
          title: i18n.t(
            change > 0
              ? "admin.statistics.insights.trend.titleUp"
              : "admin.statistics.insights.trend.titleDown",
            { change: Math.abs(change).toFixed(0) }
          ),
          detail: i18n.t("admin.statistics.insights.trend.detail", {
            lastWeek: lastWeek.toFixed(0),
            firstWeek: firstWeek.toFixed(0),
            days: dailyJobs.length,
            projected: formatNumber(projected),
          }),
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
        ? i18n.t("admin.statistics.insights.efficiency.costPart", {
            cost: (reliability.totalCostUsd / jobs).toFixed(2),
          })
        : "";
    insights.push({
      id: "efficiency",
      target: "pipeline",
      severity: "info",
      title: i18n.t("admin.statistics.insights.efficiency.title", {
        ratio: (assets / jobs).toFixed(1),
      }),
      detail: i18n.t("admin.statistics.insights.efficiency.detail", {
        assets: formatNumber(assets),
        jobs: formatNumber(jobs),
        costPart,
      }),
    });
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
