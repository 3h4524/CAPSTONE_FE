export type AdminSubscriptionPlan = {
  id: string;
  name: string;
  tier: string;
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
  sortOrder: number;
  // Used to preview whether a delete will hard-delete or soft-deactivate the plan.
  activeSubscriberCount: number;
  createdAt: string | null;
  updatedAt: string | null;
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
  sortOrder: number;
};

export type CreateSubscriptionPlanInput = SubscriptionPlanInput & { tier: string };

export type UpdateSubscriptionPlanInput = SubscriptionPlanInput;

export type DeleteSubscriptionPlanResult = {
  hardDeleted: boolean;
};
