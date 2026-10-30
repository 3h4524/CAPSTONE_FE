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
  features: PlanFeatureInput[];
};

export type CreateSubscriptionPlanInput = SubscriptionPlanInput & { tier: string };

export type UpdateSubscriptionPlanInput = SubscriptionPlanInput;
