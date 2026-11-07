// One plan feature: a flag switched on or off, or a limit (null = no limit).
export type PlanFeatureInput = {
  code: string;
  isEnabled: boolean;
  limitValue: number | null;
};

export type AdminSubscriptionPlan = {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  monthlyPriceUsd: number;
  annualPriceUsd: number | null;
  // The same prices in whole đồng, as PayOS charges them (USD × usdToVndRate).
  monthlyPriceVnd: number;
  annualPriceVnd: number | null;
  // The PayOS rate, so the plan form can preview a price as it is typed.
  usdToVndRate: number;
  maxBatchSize: number;
  maxConcurrentJobs: number;
  maxProductsPerMonth: number;
  imageGenerationQuota: number;
  videoGenerationQuota: number;
  apiCallQuota: number;
  storageQuotaGb: number;
  customApiKeysAllowed: boolean;
  whiteLabelExportEnabled: boolean;
  prioritySupport: boolean;
  isActive: boolean;
  // Paid subscribers only, the same figure as Active Subscribers on the Revenue page.
  activeSubscriberCount: number;
  // Sellers trying this plan for free right now.
  trialSubscriberCount: number;
  // False when any subscription (active or historical) ever referenced this plan — Delete is
  // permanent-only and is blocked in that case; deactivate via the "Plan is active" toggle instead.
  canDelete: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  // Every configurable feature, in catalog order.
  features: PlanFeatureInput[];
};

// Shared by both Create and Edit forms; the Tier slug is only ever sent when creating (BR197).
export type SubscriptionPlanInput = {
  name: string;
  description: string | null;
  monthlyPriceUsd: number;
  annualPriceUsd: number | null;
  maxBatchSize: number;
  maxConcurrentJobs: number;
  maxProductsPerMonth: number;
  imageGenerationQuota: number;
  videoGenerationQuota: number;
  apiCallQuota: number;
  storageQuotaGb: number;
  customApiKeysAllowed: boolean;
  whiteLabelExportEnabled: boolean;
  prioritySupport: boolean;
  isActive: boolean;
  // Sent when creating a plan; an edit leaves features to the plan card.
  features?: PlanFeatureInput[];
};

export type CreateSubscriptionPlanInput = SubscriptionPlanInput & { tier: string };

export type UpdateSubscriptionPlanInput = SubscriptionPlanInput;

// A plan feature's setting: whether the plan has it, and a limit's value (null = no limit).
export type PlanFeatureSetting = {
  isEnabled: boolean;
  limitValue: number | null;
};

// What one change did to a plan feature; sending `before` back undoes it.
export type PlanFeatureChange = {
  code: string;
  label: string;
  kind: "flag" | "limit";
  before: PlanFeatureSetting;
  after: PlanFeatureSetting;
  // Subscribers who keep the old setting until their period ends, and the last of those dates.
  keptBy: number;
  keptUntil: string | null;
};

export type PlanFeatureChanges = {
  planId: string;
  planName: string;
  changes: PlanFeatureChange[];
};

// Who a change to a plan feature would reach, shown before the Admin confirms it.
export type PlanFeatureImpact = {
  code: string;
  label: string;
  current: PlanFeatureSetting;
  proposed: PlanFeatureSetting;
  subscribers: number;
  trials: number;
  isReduction: boolean;
  keptBy: number;
  keptUntil: string | null;
  // Plan subscribers who used it in the last usageDays days; null when it is not measured.
  usedRecently: number | null;
  usageDays: number;
  // Of keptBy: those whose period began with the plan giving it keep it to the end of the period…
  paidForBy: number;
  paidForUntil: string | null;
  // …and those given it after their period began keep it for noticeDays days.
  noticeBy: number;
  noticeUntil: string | null;
  // The plan started giving it less than a day ago: nobody keeps it, as with a mistake undone.
  givenRecently: boolean;
  noticeDays: number;
};

// One change to the plans, Free or the trial, as the History tab lists it.
export type PlanHistoryAction = "add" | "edit" | "delete";

export type PlanHistoryEntry = {
  id: string;
  at: string;
  actorName: string | null;
  kind: "plan" | "feature" | "limit" | "catalog" | "settings" | "duplicate" | "order" | "other";
  planName: string | null;
  summary: string;
};

export type DuplicatedPlan = { planId: string; name: string; tier: string };
