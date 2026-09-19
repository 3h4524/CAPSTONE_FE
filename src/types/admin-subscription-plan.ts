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
  activeSubscriberCount: number;
  // False when any subscription (active or historical) ever referenced this plan — Delete is
  // permanent-only and is blocked in that case; deactivate via the "Plan is active" toggle instead.
  canDelete: boolean;
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
