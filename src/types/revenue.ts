export interface MetricDetail {
  value: number;
  previousValue: number;
  percentageChange: number;
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
  planBreakdown?: Record<string, number>;
}

export interface RevenueByPlanDto {
  planName: string;
  amount: number;
  percentage: number;
}

export interface RevenueChartDto {
  trend: RevenueTrendPointDto[];
  byPlan: RevenueByPlanDto[];
  availablePlans?: string[];
}

export interface RevenueInvoiceDto {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  status: string;
  paymentDate: string | null;
}

export interface RevenueFilterDto {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  granularity: "Day" | "Month" | "Year";
  page?: number;
  pageSize?: number;
}
