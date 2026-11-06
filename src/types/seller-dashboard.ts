/** Where the Seller stands; the Dashboard orders its panels by it. */
export type SellerStage = "new" | "producing" | "scaling";

export type DashboardPeriod = 7 | 30 | 90;

/** A figure for the period beside the period of the same length before it. */
export type Kpi = {
  value: number;
  previousValue: number;
  /** Null when the period before had nothing to compare with. */
  changePercent: number | null;
};

export type DashboardKpis = {
  productsCreated: Kpi;
  successRatePercent: Kpi;
  listingsPublished: Kpi;
  costPerProductUsd: Kpi;
};

export type PipelineStageKey =
  | "queued"
  | "designing"
  | "design_review"
  | "mockup"
  | "video"
  | "listing"
  | "ready"
  | "published";

export type PipelineStage = {
  stage: PipelineStageKey;
  count: number;
  /** Products processing far longer than usual. */
  stuckCount: number;
};

export type ActiveBatch = {
  id: string;
  name: string;
  status: string;
  progressPercent: number;
  processed: number;
  failed: number;
  total: number;
  estimatedCompletionAt: string | null;
  /** The exact page: the job inside its workflow, or its own page. */
  url: string;
};

/** One day of the period. */
export type TrendPoint = {
  /** YYYY-MM-DD */
  date: string;
  products: number;
  /** Products a batch job finished that day, failed ones included. */
  finished: number;
  failed: number;
  costUsd: number;
};

export type RecentJob = {
  id: string;
  name: string;
  status: string;
  total: number;
  failed: number;
  createdAt: string | null;
  url: string;
};

export type AiFeatureCost = {
  feature: string;
  calls: number;
  failed: number;
  costUsd: number;
};

/** One thing the figures say, worked out by the backend. */
export type Insight = {
  tone: "warning" | "good";
  title: string;
  detail: string;
};

/** GET /api/dashboard/summary */
export type DashboardSummary = {
  stage: SellerStage;
  periodDays: DashboardPeriod;
  kpis: DashboardKpis;
  /** One point per day of the period, oldest first. */
  trend: TrendPoint[];
  pipeline: PipelineStage[];
  failedProducts: number;
  activeBatches: ActiveBatch[];
  recentJobs: RecentJob[];
  /** The most expensive feature first. */
  aiUsage: AiFeatureCost[];
  /** Warnings first, at most three. */
  insights: Insight[];
};

export type ActionItemType =
  | "etsy_reconnect"
  | "etsy_upload_failed"
  | "batch_failed"
  | "video_failed"
  | "stuck_products"
  | "design_review"
  | "listing_review"
  | "video_review"
  | "low_seo";

export type ActionItemSeverity = "info" | "warning" | "error" | "critical";

/** A kind of work that waits on the Seller, grouped across products. */
export type ActionItem = {
  type: ActionItemType;
  severity: ActionItemSeverity;
  count: number;
  priority: number;
  oldestAt: string | null;
  /** The one place when all of it is there, otherwise the page that lists it. */
  actionUrl: string;
  /** Where the work sits, the largest share first, at most three. */
  targets: ActionTarget[];
};

/** One place an action item's work sits, e.g. a batch job with 12 designs to review. */
export type ActionTarget = {
  label: string;
  count: number;
  url: string;
};

/** GET /api/dashboard/action-items, the most severe first. */
export type DashboardActionItems = {
  items: ActionItem[];
};
