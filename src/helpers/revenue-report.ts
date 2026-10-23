import { formatChange } from "@/helpers/revenue-change";
import { formatTransactionDate, getTransactionStatusStyle } from "@/helpers/revenue-transactions";
import type {
  MetricDetail,
  RevenueChartDto,
  RevenueFilterDto,
  RevenueInsightsDto,
  RevenueInvoiceDto,
  RevenueMetricsDto,
} from "@/types/revenue";

/**
 * How a column's numbers are written: money in whole VND or USD, percentages as 12.3 (not 0.123),
 * plain counts, or text.
 */
export type ReportColumnKind = "text" | "money" | "percent" | "number";

export type ReportCell = string | number | null;

export interface ReportSection {
  /** The worksheet the section goes on; sections sharing a sheet are stacked in order. */
  sheet: string;
  title: string;
  columns: { header: string; kind: ReportColumnKind }[];
  rows: ReportCell[][];
}

export interface RevenueReportInput {
  filter: RevenueFilterDto;
  currency: "VND" | "USD";
  generatedAt: Date;
  metrics?: RevenueMetricsDto;
  charts?: RevenueChartDto;
  insights?: RevenueInsightsDto;
  /** Every transaction matching the period and the table filters. */
  transactions: RevenueInvoiceDto[];
  /** The table filters the transactions were fetched with. */
  transactionFilter: { search?: string; plan?: string; status?: string };
}

const DAY_MS = 86_400_000;

/** The equally long period right before the selected one, as the API compares against. */
export function previousPeriod(startDate: string, endDate: string): { start: string; end: string } {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const days = Math.round((end - start) / DAY_MS) + 1;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { start: iso(start - days * DAY_MS), end: iso(end - days * DAY_MS) };
}

/**
 * Builds the revenue report as sections of typed rows; {@link toCsv} and the Excel writer only
 * lay them out. Amounts arrive in invoice units (thousand VND) and leave as whole VND, or unchanged
 * in USD, matching what the dashboard shows for the selected currency.
 */
export function buildRevenueReport(input: RevenueReportInput): ReportSection[] {
  const { filter, currency, metrics, charts, insights, transactions } = input;
  const money = (amount: number | null | undefined): number | null =>
    amount == null ? null : currency === "VND" ? Math.round(amount * 1000) : Math.round(amount * 100) / 100;
  const moneyHeader = (label: string) => `${label} (${currency})`;
  const previous = previousPeriod(filter.startDate, filter.endDate);
  const forecast = insights?.forecast;
  const subs = insights?.subscriptionAnalytics;

  const tableFilters = [
    input.transactionFilter.search && `search "${input.transactionFilter.search}"`,
    input.transactionFilter.plan && `plan ${input.transactionFilter.plan}`,
    input.transactionFilter.status && `status ${getTransactionStatusStyle(input.transactionFilter.status).label}`,
  ].filter(Boolean);

  const sections: ReportSection[] = [
    {
      sheet: "Summary",
      title: "Revenue Report",
      columns: [
        { header: "Field", kind: "text" },
        { header: "Value", kind: "text" },
      ],
      rows: [
        ["Period", `${filter.startDate} to ${filter.endDate}`],
        ["Compared with", `${previous.start} to ${previous.end}`],
        ["Granularity", filter.granularity],
        ["Currency", currency],
        ["Transactions filter", tableFilters.length > 0 ? tableFilters.join(", ") : "None (all transactions)"],
        ["Generated at", input.generatedAt.toISOString().replace("T", " ").slice(0, 16) + " UTC"],
      ],
    },
  ];

  const metricRow = (
    label: string,
    metric: MetricDetail | undefined,
    kind: "money" | "number" | "percent"
  ): ReportCell[] => {
    if (!metric) return [label, null, null, "—"];
    const value = (v: number) => (kind === "money" ? money(v) : v);
    // Churn is a rate, so its change is in percentage points (see SubscriptionAnalyticsCard).
    const unit = kind === "percent" ? " pp" : "%";
    return [label, value(metric.value), value(metric.previousValue), formatChange(metric.percentageChange, metric.value, unit)];
  };

  if (metrics || subs) {
    sections.push({
      sheet: "Summary",
      title: "Key Metrics",
      columns: [
        { header: "Metric", kind: "text" },
        { header: "Current period", kind: "number" },
        { header: "Previous period", kind: "number" },
        { header: "Change", kind: "text" },
      ],
      rows: [
        metricRow(moneyHeader("Total revenue"), metrics?.totalRevenue, "money"),
        metricRow(moneyHeader("Net revenue"), metrics?.netRevenue, "money"),
        metricRow(moneyHeader("MRR"), metrics?.subscriptionMrr, "money"),
        metricRow(moneyHeader("ARR"), metrics?.arr, "money"),
        metricRow("Active subscribers", metrics?.activeSubscribers, "number"),
        metricRow(moneyHeader("Refunds"), metrics?.refundAmount, "money"),
        metricRow("New subscriptions", subs?.newSubscriptions, "number"),
        metricRow("Renewals (payments)", subs?.renewals, "number"),
        metricRow("Cancellations", subs?.cancellations, "number"),
        subs?.hasChurnRate
          ? metricRow("Churn rate (% per month)", subs.churnRate, "percent")
          : ["Churn rate (% per month)", null, null, "—"],
      ],
    });
  }

  if (charts?.byPlan.length) {
    sections.push({
      sheet: "By Plan",
      title: "Revenue by Plan",
      columns: [
        { header: "Plan", kind: "text" },
        { header: moneyHeader("Revenue"), kind: "money" },
        { header: "Share (%)", kind: "percent" },
        { header: "Growth vs. previous", kind: "text" },
        { header: "Purchases", kind: "number" },
        { header: "Customers", kind: "number" },
        { header: moneyHeader("ARPU"), kind: "money" },
        { header: "Retention (%)", kind: "percent" },
      ],
      rows: charts.byPlan.map((p) => [
        p.planName,
        money(p.amount),
        p.percentage,
        formatChange(p.percentageChange, p.amount),
        p.purchaseCount,
        p.uniqueCustomers,
        money(p.arpu),
        p.retentionRate,
      ]),
    });
  }

  if (charts?.trend.length) {
    sections.push({
      sheet: "Revenue Trend",
      title: `Revenue Trend (by ${filter.granularity.toLowerCase()})`,
      columns: [
        { header: "Period", kind: "text" },
        { header: moneyHeader("Revenue"), kind: "money" },
        { header: moneyHeader("Previous period"), kind: "money" },
      ],
      rows: charts.trend.map((t) => [t.dateLabel, money(t.amount), money(t.previousAmount)]),
    });
  }

  if (subs?.points.length) {
    sections.push({
      sheet: "Subscriptions",
      title: "Subscriptions over time",
      columns: [
        { header: "Period starting", kind: "text" },
        { header: "New", kind: "number" },
        { header: "Renewals", kind: "number" },
        { header: "Cancellations", kind: "number" },
      ],
      rows: subs.points.map((p) => [p.dateLabel, p.newSubscriptions, p.renewals, p.cancellations]),
    });
  }

  if (forecast && forecast.status !== "insufficient" && forecast.points.length) {
    sections.push({
      sheet: "Forecast",
      title: `Weekly Revenue Forecast (linear regression over ${forecast.sampleWeeks} weeks, R² = ${forecast.rSquared.toFixed(2)})`,
      columns: [
        { header: "Week of", kind: "text" },
        { header: "Type", kind: "text" },
        { header: moneyHeader("Actual"), kind: "money" },
        { header: moneyHeader("Forecast"), kind: "money" },
        { header: moneyHeader("Optimistic (95%)"), kind: "money" },
        { header: moneyHeader("Conservative (95%)"), kind: "money" },
      ],
      rows: forecast.points.map((p) => [
        p.monthLabel,
        p.isHistorical ? "Actual" : "Forecast",
        money(p.actual),
        money(p.forecastBase),
        money(p.optimistic),
        money(p.conservative),
      ]),
    });
  }

  if (insights?.financialAlerts.length) {
    sections.push({
      sheet: "Alerts",
      title: "Financial Alerts",
      columns: [
        { header: "Severity", kind: "text" },
        { header: "Alert", kind: "text" },
        { header: "Details", kind: "text" },
        { header: moneyHeader("Amount"), kind: "money" },
        { header: "Amount means", kind: "text" },
        { header: "Scope", kind: "text" },
      ],
      rows: insights.financialAlerts.map((a) => [
        SEVERITY_LABEL[a.type] ?? a.type,
        a.title,
        a.description,
        money(a.amount),
        a.amountLabel ?? null,
        a.scope,
      ]),
    });
  }

  sections.push({
    sheet: "Transactions",
    title: `Transactions (${transactions.length})`,
    columns: [
      { header: "Invoice No", kind: "text" },
      { header: "User ID", kind: "text" },
      { header: "Customer", kind: "text" },
      { header: "Email", kind: "text" },
      { header: "Plan", kind: "text" },
      { header: moneyHeader("Amount"), kind: "money" },
      { header: "Payment method", kind: "text" },
      { header: "Status", kind: "text" },
      { header: "Date", kind: "text" },
    ],
    rows: transactions.map((t) => [
      t.invoiceNumber,
      t.userId,
      t.customerName,
      t.customerEmail,
      t.planName,
      money(t.amount),
      t.paymentMethod ?? null,
      getTransactionStatusStyle(t.status).label,
      formatTransactionDate(t.paymentDate, t.createdAt),
    ]),
  });

  return sections;
}

const SEVERITY_LABEL: Record<string, string> = {
  danger: "Critical",
  warning: "Warning",
  purple: "Notice",
  info: "Info",
  success: "OK",
};

const csvCell = (cell: ReportCell): string => {
  if (cell === null) return "";
  if (typeof cell === "number") return String(cell);
  return /[",\r\n]/.test(cell) || cell.startsWith(" ") ? `"${cell.replace(/"/g, '""')}"` : cell;
};

/**
 * Lays the sections out one after another in a single CSV: a title line, the header, the rows and
 * a blank line. Starts with a UTF-8 BOM so Excel reads Vietnamese names correctly.
 */
export function toCsv(sections: ReportSection[]): string {
  const lines: string[] = [];
  for (const section of sections) {
    if (lines.length > 0) lines.push("");
    lines.push(csvCell(section.title));
    lines.push(section.columns.map((c) => csvCell(c.header)).join(","));
    for (const row of section.rows) lines.push(row.map(csvCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** The file name shared by both formats, e.g. revenue-report_2026-01-01_2026-10-23. */
export function reportFileName(filter: RevenueFilterDto): string {
  return `revenue-report_${filter.startDate}_${filter.endDate}`;
}
