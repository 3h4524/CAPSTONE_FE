import type { AdminOperationsDto, OperationsBucket } from "@/types/admin";

/** The Dashboard's periods, each ending today. */
export const DASHBOARD_RANGES = [
  { key: "Week", label: "Last 7 days", period: "week" },
  { key: "Month", label: "Last 30 days", period: "month" },
  { key: "HalfYear", label: "Last 6 months", period: "6 months" },
  { key: "Year", label: "Last 1 year", period: "year" },
] as const;

const STATISTICS_WINDOWS: Record<string, { timeRange: string; label: string }> = {
  Week: { timeRange: "7d", label: "Last 7 days" },
  Month: { timeRange: "30d", label: "Last 30 days" },
  HalfYear: { timeRange: "180d", label: "Last 6 months" },
  Year: { timeRange: "year", label: "Last 12 months" },
};

/** The System Statistics window matching a Dashboard period. */
export const statisticsWindow = (timeRange: string) =>
  STATISTICS_WINDOWS[timeRange] ?? STATISTICS_WINDOWS.Month;

export type DashboardTone = "emerald" | "amber" | "rose" | "sky" | "violet" | "slate";

/** A change against the previous period as a pill; null means there was nothing to compare with. */
export const changeBadge = (
  percent: number | null | undefined,
  lowerIsBetter = false
): { text: string; tone: DashboardTone } => {
  if (percent === null || percent === undefined) return { text: "New", tone: "sky" };
  if (percent === 0) return { text: "0%", tone: "slate" };
  const better = lowerIsBetter ? percent < 0 : percent > 0;
  return {
    text: `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`,
    tone: better ? "emerald" : "rose",
  };
};

/** The change from previous to current in percent, or null when there was nothing before. */
export const percentChange = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : null;

const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

const utcDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** A throughput bucket's name: a day or a month. */
export const bucketLabel = (start: string, bucket: OperationsBucket) => {
  const date = utcDate(start);
  if (bucket === "month")
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

/** Days from the first to the last day of a period, both counted. */
export const periodDays = (start: string, end: string) =>
  Math.round((utcDate(end).getTime() - utcDate(start).getTime()) / 86_400_000) + 1;

export const FUNNEL_STEPS = [
  { key: "products", label: "Created" },
  { key: "designed", label: "Designed" },
  { key: "mockedUp", label: "Mock-ups" },
  { key: "listed", label: "Listing copy" },
  { key: "published", label: "Published" },
] as const;

export type FunnelStep = {
  key: (typeof FUNNEL_STEPS)[number]["key"];
  label: string;
  count: number;
  /** Share of the products created that reached this step. */
  ofCreated: number;
  /** Share of the previous step's products that reached this one. */
  fromPrevious: number;
};

export const funnelSteps = (funnel: AdminOperationsDto["funnel"]): FunnelStep[] =>
  FUNNEL_STEPS.map((step, index) => {
    const count = funnel[step.key];
    const previous = index === 0 ? count : funnel[FUNNEL_STEPS[index - 1].key];
    return {
      ...step,
      count,
      ofCreated: share(count, funnel.products),
      fromPrevious: index === 0 ? 100 : share(count, previous),
    };
  });

/** The step that loses the most products, or null when every product went all the way. */
export const biggestDrop = (steps: FunnelStep[]) => {
  let worst: { from: string; to: string; lost: number; kept: number } | null = null;
  for (let index = 1; index < steps.length; index++) {
    const lost = steps[index - 1].count - steps[index].count;
    if (lost > 0 && (!worst || lost > worst.lost)) {
      worst = {
        from: steps[index - 1].label,
        to: steps[index].label,
        lost,
        kept: steps[index].fromPrevious,
      };
    }
  }
  return worst;
};

const AI_FEATURE_LABELS: Record<string, string> = {
  image_generation: "Design images",
  mockup: "Lifestyle mock-ups",
  listing: "Listing copy",
  video: "AI video",
};

export const aiFeatureLabel = (feature: string) => {
  const label = AI_FEATURE_LABELS[feature] ?? feature.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Failure rates (in percent) from which AI calls are worth a look, and need action. */
export const AI_FAILURE_WARNING = 2;
export const AI_FAILURE_CRITICAL = 5;

export const failureTone = (rate: number): DashboardTone =>
  rate >= AI_FAILURE_CRITICAL ? "rose" : rate >= AI_FAILURE_WARNING ? "amber" : "emerald";

// Too few calls say nothing about a feature's failure rate.
const MIN_CALLS_FOR_RATE = 20;

export const aiSummary = (usage: AdminOperationsDto["aiUsage"], productsCreated: number) => {
  const calls = usage.reduce((sum, feature) => sum + feature.calls, 0);
  const failed = usage.reduce((sum, feature) => sum + feature.failed, 0);
  const costUsd = usage.reduce((sum, feature) => sum + feature.costUsd, 0);
  const worst = usage
    .filter((feature) => feature.calls >= MIN_CALLS_FOR_RATE)
    .map((feature) => ({ ...feature, failureRate: share(feature.failed, feature.calls) }))
    .sort((a, b) => b.failureRate - a.failureRate)[0];
  return {
    calls,
    failed,
    costUsd,
    failureRate: share(failed, calls),
    costPerProduct: productsCreated > 0 ? costUsd / productsCreated : null,
    /** The least reliable feature, when it fails often enough to matter. */
    worst: worst && worst.failureRate >= AI_FAILURE_WARNING ? worst : null,
  };
};

export const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount < 10 ? 2 : 0,
  }).format(amount);

/** "3 hours ago", "2 days ago": how long ago a moment was, for activity lists. */
export const timeAgo = (moment: string, now = new Date()) => {
  const seconds = Math.round((new Date(moment).getTime() - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return "just now";
};
