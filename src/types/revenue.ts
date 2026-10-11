export interface MetricDetail {
  value: number;
  previousValue: number;
  percentageChange: number;
}

export interface RevenueMetricsDto {
  totalNetRevenue: MetricDetail;
  subscriptionMrr: MetricDetail;
  activeSubscribers: MetricDetail;
  arpu: MetricDetail;
}

export interface RevenueTrendPointDto {
  dateLabel: string;
  amount: number;
}

export interface RevenueByPlanDto {
  planName: string;
  amount: number;
  percentage: number;
}

export interface RevenueChartDto {
  trend: RevenueTrendPointDto[];
  byPlan: RevenueByPlanDto[];
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
