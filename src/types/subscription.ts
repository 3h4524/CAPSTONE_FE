export type CurrentSubscription = {
  subscriptionId: string;
  planId: string;
  planName: string;
  shortDescription: string | null;
  status: string;
  billingCycle: string;
  price: number;
  startDate: string;
  renewalDate: string;
  // Set when a downgrade is scheduled; null when nothing is scheduled.
  scheduledPlanName: string | null;
  scheduledPlanEffectiveDate: string | null;
  // The free Pro trial has no invoice and ends on trialEndsAt, returning the Seller to Free.
  isTrial: boolean;
  trialEndsAt: string | null;
  // Nothing charges a renewal by itself: the Seller pays each cycle with Renew now, open from a
  // week before renewalDate. From renewalDate the status is "past_due" and the plan keeps working
  // until lastGraceDay, then the Seller is back on Free.
  canRenew: boolean;
  lastGraceDay: string | null;
  // The next cycle's plan (a scheduled downgrade, or the current plan) and its price.
  renewalPlanName: string | null;
  renewalPrice: number | null;
  // price and renewalPrice (stored in USD) in whole đồng, as PayOS charges them.
  priceVnd: number;
  renewalPriceVnd: number | null;
};

export type UsageQuota = {
  quotaCode: string;
  label: string;
  used: number;
  // 0 means no limit: plans differ by feature, not by monthly quota.
  limit: number;
  unit: string;
  percentUsed: number;
  isWarning: boolean;
};

export type PlanFeatureFlag = {
  featureCode: string;
  isEnabled: boolean;
  limitValue: number | null;
};

export type PlanQuotas = {
  imageGenerationQuota: number;
  videoGenerationQuota: number;
  apiCallQuota: number;
  storageQuotaGb: number;
  maxBatchSize: number;
  maxProductsPerMonth: number;
  maxConcurrentJobs: number;
};

export type AvailablePlan = {
  planId: string;
  name: string;
  tier: string;
  description: string | null;
  monthlyPriceUsd: number;
  // Null means this plan has no annual option — the Annual billing choice must not be offered.
  annualPriceUsd: number | null;
  // The same prices in whole đồng, as PayOS charges them.
  monthlyPriceVnd: number;
  annualPriceVnd: number | null;
  isCurrentPlan: boolean;
  features: PlanFeatureFlag[];
  quotas: PlanQuotas;
};

export type RecentInvoice = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  planName: string;
  totalAmount: number;
  status: string;
  // totalAmount (USD) in whole đồng.
  totalAmountVnd: number;
};

export type SubscriptionOverview = {
  currentSubscription: CurrentSubscription | null;
  usageQuotas: UsageQuota[];
  availablePlans: AvailablePlan[];
  recentInvoices: RecentInvoice[];
  hasActivePaidPlan: boolean;
  // True when the Seller has no paid plan and never started a trial.
  trialEligible: boolean;
  trialDays: number;
};

export type TrialResult = {
  subscriptionId: string;
  planName: string;
  trialEndsAt: string;
};

export type EntitlementFeature = {
  code: string;
  label: string;
  kind: "flag" | "limit";
  group: string;
  isEnabled: boolean;
  // For a limit: its value, or null for no limit.
  limitValue: number | null;
};

// What the Seller's current plan allows. hasPlan is false on Free: browse, but run nothing.
export type Entitlements = {
  hasPlan: boolean;
  planName: string | null;
  tier: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  // -1 means no limit.
  maxBatchSize: number;
  maxConcurrentJobs: number;
  prioritySupport: boolean;
  features: EntitlementFeature[];
};

export type BillingCycle = "monthly" | "annual";

// A newly created, unpaid PayOS checkout — nothing is active yet.
export type PendingCheckout = {
  invoiceId: string;
  // Raw VietQR payload string; render with qrcode.react, not an <img src>.
  qrCode: string;
  checkoutUrl: string;
  amountVnd: number;
};

// "failed" = PayOS declined or the link expired; "cancelled" = the Seller backed out themselves.
export type CheckoutStatusValue = "pending" | "paid" | "failed" | "cancelled";

export type CheckoutStatus = {
  status: CheckoutStatusValue;
  planName: string;
  invoiceNumber: string;
  renewalDate: string | null;
};

// The result of upgrading a subscription.
export type UpgradeResult = {
  // False means the prorated credit fully covered the new plan's price — the upgrade already
  // took effect immediately and none of the PayOS fields below are populated.
  paymentRequired: boolean;
  dueTodayUsd: number;
  proratedCreditUsd: number;
  monthlyRate: number;
  firstRenewalDate: string;
  invoiceId: string;
  qrCode: string | null;
  checkoutUrl: string | null;
  amountVnd: number | null;
  // dueTodayUsd, proratedCreditUsd and monthlyRate in whole đồng.
  dueTodayVnd: number;
  proratedCreditVnd: number;
  monthlyRateVnd: number;
};

// The result of downgrading a subscription — scheduled only, current plan is untouched.
export type DowngradeResult = {
  targetPlanId: string;
  targetPlanName: string;
  effectiveDate: string;
};
