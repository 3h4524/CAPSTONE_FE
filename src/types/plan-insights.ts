// The Admin's Plan Insights tab. Every rate is a percentage from 0 to 100; null when there is
// nothing to divide by.

export type TrialFeatureComparison = {
  metric: string;
  label: string;
  convertedRate: number | null;
  notConvertedRate: number | null;
};

export type TrialInsight = {
  started: number;
  running: number;
  convertedToPro: number;
  convertedToStarter: number;
  convertedToOther: number;
  returnedToFree: number;
  conversionRate: number | null;
  previousConversionRate: number | null;
  featureComparison: TrialFeatureComparison[];
  // How many trials bought each plan; older responses send only the three fields above.
  convertedByPlan?: { tier: string; name: string; count: number }[] | null;
};

export type FeatureAdoption = {
  metric: string;
  label: string;
  includedInPlan: boolean;
  users: number;
  rate: number;
  // Times the median Seller who used it did so in the period; null when nobody did.
  medianUses?: number | null;
  // The plan's daily safety cap and the Sellers who reached it on some day; null without a cap.
  dailyCap?: number | null;
  usersAtDailyCap?: number | null;
};

// Every amount below is in VND at the PayOS rate.
export type PlanCost = {
  platformCostPerSubscriberVnd: number;
  revenuePerSubscriberVnd: number;
  costShare: number | null;
};

export type PlanGroupInsight = {
  key: string;
  name: string;
  isTrial: boolean;
  subscribers: number;
  hasEnoughData: boolean;
  monthlyPriceVnd: number;
  adoption: FeatureAdoption[];
  cost: PlanCost;
};

export type PipelineStage = {
  key: string;
  label: string;
  products: number;
  // False for a step on the canvas whose executor does not exist yet, such as publishing.
  isAvailable?: boolean;
};

export type UnitCost = {
  key: string;
  label: string;
  costVnd: number;
  isMeasured: boolean;
};

export type PlanInsights = {
  days: number;
  generatedAt: string;
  minimumSample: number;
  trial: TrialInsight;
  plans: PlanGroupInsight[];
  pipeline: PipelineStage[];
  unitCosts: UnitCost[];
  // The paid plans, cheapest first, each judged by fixed rules.
  verdicts: PlanVerdict[];
  // The thresholds the verdicts used (configured on the server).
  verdictRules: VerdictRules;
  // Each paid plan's customers who stopped paying compared with those who stayed.
  churnSignals?: PlanChurnSignal[];
};

export type PlanChurnSignal = {
  key: string;
  name: string;
  stayed: number;
  left: number;
  // Below this many customers in either group the comparison is a small sample.
  minimumGroup: number;
  hasEnoughData: boolean;
  leftInFirstMonthRate: number | null;
  /** Share of those who left who never used the plan's core features. */
  leftWithoutCoreUseRate: number | null;
  usageChangeBeforeLeaving: number | null;
  features: FeatureChurnSignal[];
  /** The plan's two most used features among those who stayed, by name. */
  coreFeatures: string[];
  /** Every customer who left in exactly one group, in the order they are checked. */
  leaveGroups: LeaveGroup[];
};

export type LeaveGroupKey = "never_started" | "hit_failures" | "hit_limits" | "faded" | "steady";

export type LeaveGroup = {
  key: LeaveGroupKey;
  label: string;
  left: number;
  /** Share of everyone who left; the groups add up to 100. */
  leftRate: number | null;
  stayed: number;
  /** Share of those who stayed who match the same group, for comparison. */
  stayedRate: number | null;
  /** Clearly more common among those who left. */
  notable: boolean;
};

export type FeatureChurnSignal = {
  metric: string;
  label: string;
  includedInPlan: boolean;
  // Share of those who stayed / left who used it.
  stayedRate: number | null;
  leftRate: number | null;
  usageChangeBeforeLeaving: number | null;
  stayedFailureRate: number | null;
  leftFailureRate: number | null;
  // The customers behind stayedRate and leftRate.
  stayedUsers?: number;
  leftUsers?: number;
};

export type VerdictRules = {
  premiumPriceRatio: number;
  lowRetentionRate: number;
  promoteBelowRate: number;
};

export type PlanVerdict = {
  key: string;
  name: string;
  verdict: "overpriced" | "retention_risk" | "upsell" | "healthy" | "not_enough_data";
  verdictLabel: string;
  tone: "warning" | "danger" | "info" | "success" | "neutral";
  // Up to three sentences with the figures behind the verdict.
  evidence: string[];
  // Null when there is too little data to suggest anything.
  action: string | null;
  // Sellers already using as much as a typical Seller on the next plan up.
  upsellCandidates: number;
};
