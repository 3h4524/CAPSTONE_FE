export interface MetricDetail {
  value: number;
  previousValue: number;
  /** Change vs. previousValue; null when the previous period was zero (shown as "New" / "—"). */
  percentageChange: number | null;
  sparkline?: number[];
}

export interface RevenueMetricsDto {
  totalRevenue: MetricDetail;
  netRevenue: MetricDetail;
  subscriptionMrr: MetricDetail;
  arr: MetricDetail;
  activeSubscribers: MetricDetail;
  refundAmount: MetricDetail;
  totalNetRevenue?: MetricDetail;
  arpu?: MetricDetail;
}

export interface RevenueTrendPointDto {
  dateLabel: string;
  amount: number;
  previousAmount?: number;
  planBreakdown?: Record<string, number>;
}

export interface RevenueByPlanDto {
  planName: string;
  amount: number;
  percentage: number;
  /** Paid invoices for the plan in the period. */
  purchaseCount: number;
  /** Distinct customers who paid for the plan in the period. */
  uniqueCustomers: number;
  /** amount / uniqueCustomers; null when nobody paid. */
  arpu: number | null;
  /** The plan's paying customers at the period's start and end, and what happened between. */
  customers: PlanCustomerFlowDto;
  /** % of customers.start still paying at the end, on any plan; null when customers.start < 5. */
  retentionRate: number | null;
  /** Collected revenue in the equally long previous period. */
  previousAmount: number;
  /** Change vs. previousAmount; null when the plan earned nothing in the previous period. */
  percentageChange: number | null;
  /** The plan's MRR at the end of the day before the period. */
  mrrStart: number;
  /** The plan's MRR at the end of the period. */
  mrrEnd: number;
  /** MRR change vs. mrrStart in percent; null when the plan had no MRR then. */
  mrrChangePercent: number | null;
  usageSignal: PlanUsageSignalDto;
}

/**
 * A plan's paying customers at the end of the day before the period and at its end, counted like
 * MRR. start = stayed + switchedOut + stoppedPaying; end = stayed + new + switchedIn.
 */
export interface PlanCustomerFlowDto {
  start: number;
  /** On the plan at both ends. */
  stayed: number;
  /** Moved to another plan and still paying. */
  switchedOut: number;
  /** Paying for nothing at the end. */
  stoppedPaying: number;
  /** Paying for nothing at the start. */
  new: number;
  /** Moved here from another plan. */
  switchedIn: number;
  end: number;
}

/** The feature with the largest usage gap between a plan's customers who stayed and who left. */
export interface PlanUsageSignalDto {
  stayed: number;
  left: number;
  /** Each group's minimum size for a comparison. */
  minimumGroup: number;
  hasSignal: boolean;
  feature: string | null;
  featureLabel: string | null;
  /** 0–100. */
  stayedRate: number | null;
  /** 0–100. */
  leftRate: number | null;
}

export interface RevenueChartDto {
  trend: RevenueTrendPointDto[];
  byPlan: RevenueByPlanDto[];
  availablePlans?: string[];
}

export type TransactionStatus = "paid" | "pending" | "overdue" | "refunded" | "cancelled" | "draft";

export interface RevenueInvoiceDto {
  id: string;
  invoiceNumber: string;
  /** The customer's user id; the table search matches it in full or in part. */
  userId: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  status: TransactionStatus | string;
  /** Payment date, or the invoice date when never paid (YYYY-MM-DD). */
  paymentDate: string | null;
  /** Invoice creation (checkout) timestamp. */
  createdAt?: string | null;
  /** Payment gateway, e.g. "PayOS"; card details are not stored. */
  paymentMethod?: string | null;
}

export interface RevenueFilterDto {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  granularity: "Day" | "Month" | "Year";
  page?: number;
  pageSize?: number;
  /** Transaction list only: invoice number, customer name or email. */
  search?: string;
  /** Transaction list only: exact plan name. */
  plan?: string;
  /** Transaction list only. */
  status?: TransactionStatus;
}

export interface SubscriptionAnalyticsPointDto {
  dateLabel: string;
  newSubscriptions: number;
  renewals: number;
  cancellations: number;
}

export interface SubscriptionAnalyticsDto {
  points: SubscriptionAnalyticsPointDto[];
  newSubscriptions: MetricDetail;
  renewals: MetricDetail;
  cancellations: MetricDetail;
  /** Average monthly churn in percent; only meaningful when `hasChurnRate`. */
  churnRate: MetricDetail;
  hasChurnRate: boolean;
  /** Customers with a live paid subscription at the period start. */
  activeAtPeriodStart: number;
}

export interface ForecastPointDto {
  /** Week label (week start, e.g. "Oct 13"); the field name is kept for API compatibility. */
  monthLabel: string;
  isHistorical: boolean;
  actual?: number | null;
  forecastBase?: number | null;
  optimistic?: number | null;
  conservative?: number | null;
  percentageChangeVsCurrent: number;
}

export type RevenueForecastStatus = "ok" | "low_confidence" | "insufficient";

export interface RevenueForecastDto {
  points: ForecastPointDto[];
  currentMrr: number;
  /** Weekly trend as a percentage of the mean weekly revenue. */
  projectedGrowthRate: number;
  status: RevenueForecastStatus;
  /** Completed weeks the linear regression was fitted on. */
  sampleWeeks: number;
  rSquared: number;
  /** Regression slope: revenue change per week. */
  weeklyTrend: number;
}

export interface FinancialAlertDto {
  /** The rule that raised the alert, e.g. "lapsed-subscriptions". */
  id: string;
  type: "danger" | "warning" | "info" | "purple" | "success";
  title: string;
  description: string;
  /** How many things the alert counts; null for a rate alert. A higher count makes it new again. */
  count?: number | null;
  /** A money figure in full VND, formatted by the client. */
  amount?: number | null;
  /** What `amount` means, e.g. "per month at risk". */
  amountLabel?: string | null;
  /** "Now", "Selected period", "Next 7 days" or "Last 26 weeks". */
  scope: string;
  /** A transaction status the "Review" action filters the table by. */
  actionStatus?: TransactionStatus | null;
}

export interface MrrMovementMonthDto {
  /** The month's first day (YYYY-MM-DD). */
  monthStart: string;
  new: number;
  expansion: number;
  contraction: number;
  churn: number;
  /** new + expansion - contraction - churn. */
  net: number;
}

/**
 * MRR at the period start, each cause of change and MRR at its end:
 * end = start + new + movedIn + expansion - contraction - movedOut - churn.
 */
export interface MrrBridgeDto {
  /** The plan, or null for all plans together. */
  planName: string | null;
  start: number;
  new: number;
  /** Customers who changed to this plan from another; always 0 for all plans together. */
  movedIn: number;
  expansion: number;
  contraction: number;
  /** Customers who changed from this plan to another; always 0 for all plans together. */
  movedOut: number;
  churn: number;
  end: number;
}

export interface MrrMovementDto {
  /** Six calendar months ending with the period's month, oldest first. */
  months: MrrMovementMonthDto[];
  /** The selected period for all plans together (planName null), then each plan. */
  period: MrrBridgeDto[];
}

export interface RevenueInsightsDto {
  subscriptionAnalytics: SubscriptionAnalyticsDto;
  forecast: RevenueForecastDto;
  financialAlerts: FinancialAlertDto[];
  mrrMovement: MrrMovementDto;
}

