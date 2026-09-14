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
};

export type UsageQuota = {
  quotaCode: string;
  label: string;
  used: number;
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
};

export type SubscriptionOverview = {
  currentSubscription: CurrentSubscription | null;
  usageQuotas: UsageQuota[];
  availablePlans: AvailablePlan[];
  recentInvoices: RecentInvoice[];
  hasActivePaidPlan: boolean;
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
