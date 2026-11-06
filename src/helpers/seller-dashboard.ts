import type { SellerOpportunity } from "@/api/market-opportunities";
import { ACTION_ITEM_COPY } from "@/constants/seller-dashboard";
import type {
  ActionItem,
  DashboardSummary,
  Kpi,
  PipelineStage,
  TrendPoint,
} from "@/types/seller-dashboard";

const HOUR_MS = 3_600_000;

/** Each KPI's day-by-day values, for the sparklines. A day with nothing finished repeats the day before. */
export const buildKpiSparklines = (trend: TrendPoint[]) => {
  let lastRate = 0;
  return {
    products: trend.map((point) => point.products),
    successRate: trend.map((point) => {
      if (point.finished > 0) lastRate = ((point.finished - point.failed) / point.finished) * 100;
      return lastRate;
    }),
    cost: trend.map((point) => point.costUsd),
  };
};

/** "Mar 4" for a YYYY-MM-DD day, read as that calendar day wherever the viewer is. */
export const formatTrendDay = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const AI_FEATURE_LABELS: Record<string, string> = {
  image_generation: "Design images",
  mockup: "Mock-ups",
  video: "Videos",
  listing: "Listing copy",
  seo: "SEO scoring",
  integration: "Store uploads",
};

export const describeAiFeature = (feature: string) =>
  AI_FEATURE_LABELS[feature] ?? feature.replaceAll("_", " ");

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** The Dashboard as a CSV: the KPIs beside the period before, then one row per day. */
export const buildDashboardCsv = (summary: DashboardSummary) => {
  const { kpis } = summary;
  const rows: (string | number)[][] = [
    ["Metric", `Last ${summary.periodDays} days`, "Previous period", "Change %"],
    ...(
      [
        ["Products created", kpis.productsCreated],
        ["Pipeline success rate %", kpis.successRatePercent],
        ["Listings published", kpis.listingsPublished],
        ["AI cost per product (USD)", kpis.costPerProductUsd],
      ] as const
    ).map(([label, kpi]) => [label, kpi.value, kpi.previousValue, kpi.changePercent ?? ""]),
    [],
    ["Date", "Products created", "Products finished", "Failed", "AI cost (USD)"],
    ...summary.trend.map((point) => [
      point.date,
      point.products,
      point.finished,
      point.failed,
      point.costUsd,
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
};
const DAY_MS = 24 * HOUR_MS;

/** "62 designs wait for your review", or "1 design waits…". */
export const describeActionItem = (item: ActionItem) => {
  const copy = ACTION_ITEM_COPY[item.type];
  return `${item.count.toLocaleString()} ${item.count === 1 ? copy.singular : copy.plural}`;
};

/** How long the oldest of the item's records has waited, e.g. "waiting 3 days". */
export const describeWaiting = (oldestAt: string | null, now: Date = new Date()) => {
  if (!oldestAt) return null;
  const waited = now.getTime() - new Date(oldestAt).getTime();
  if (waited < HOUR_MS) return "just now";
  if (waited < DAY_MS) {
    const hours = Math.floor(waited / HOUR_MS);
    return `waiting ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.floor(waited / DAY_MS);
  return `waiting ${days} day${days === 1 ? "" : "s"}`;
};

const isUrgent = (item: ActionItem) => item.severity === "critical" || item.severity === "error";

/** The inbox's two groups: what broke and must be fixed, and what only waits for a review. */
export const splitActionItems = (items: ActionItem[]) => ({
  fixNow: items.filter(isUrgent),
  toReview: items.filter((item) => !isUrgent(item)),
});

/** One line that tells the Seller whether anything needs them today. */
export const describeGreeting = (items: ActionItem[]) => {
  if (items.length === 0) return "Nothing needs you right now.";
  const urgent = items.filter(isUrgent);
  const things = `${items.length} thing${items.length === 1 ? "" : "s"}`;
  return urgent.length > 0
    ? `${things} need you today, ${urgent.length} of them urgent.`
    : `${things} need you today.`;
};

export type AllowanceState = "over" | "near" | "ok";

const NEAR_LIMIT_SHARE = 0.8;

/** Whether an allowance is used up (or past it), close to it, or comfortable. */
export const describeAllowanceState = (used: number, limit: number): AllowanceState =>
  limit > 0 && used >= limit
    ? "over"
    : limit > 0 && used / limit >= NEAR_LIMIT_SHARE
      ? "near"
      : "ok";

export type ChangeTone = "good" | "bad" | "neutral";

/**
 * A KPI's change as text and tone. `lowerIsBetter` flips the tone for costs, where a rise is bad.
 * Returns null when the period before had nothing to compare with.
 */
export const describeChange = (kpi: Kpi, lowerIsBetter = false) => {
  if (kpi.changePercent === null) return null;
  const percent = kpi.changePercent;
  const text = `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`;
  if (percent === 0) return { text, tone: "neutral" as ChangeTone };
  const isGood = percent > 0 !== lowerIsBetter;
  return { text, tone: (isGood ? "good" : "bad") as ChangeTone };
};

/** Products still moving through the pipeline: every stage but ready and published. */
export const countInProgress = (stages: PipelineStage[]) =>
  stages
    .filter((stage) => stage.stage !== "ready" && stage.stage !== "published")
    .reduce((sum, stage) => sum + stage.count, 0);

/** The best-ranked niches the Seller has not acted on, the same order Market Radar lists them in. */
export const pickTopOpportunities = (opportunities: SellerOpportunity[], limit: number) =>
  opportunities
    .filter((opportunity) => opportunity.state === "new")
    .sort(
      (a, b) =>
        (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
        b.finalScore - a.finalScore
    )
    .slice(0, limit);

export const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: value > 0 && value < 1 ? 3 : 2,
  }).format(value);
