import ExcelJS from "exceljs";
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRevenueReport, previousPeriod, type RevenueReportInput, toCsv } from "@/helpers/revenue-report";
import { toXlsx } from "@/helpers/revenue-report-xlsx";
import type { MetricDetail } from "@/types/revenue";

const metric = (value: number, previousValue: number, percentageChange: number | null): MetricDetail => ({
  value,
  previousValue,
  percentageChange,
});

const input: RevenueReportInput = {
  filter: { startDate: "2026-09-01", endDate: "2026-09-30", granularity: "Month" },
  currency: "VND",
  generatedAt: new Date("2026-10-23T05:00:00Z"),
  metrics: {
    totalRevenue: metric(299.97, 199.98, 50),
    netRevenue: metric(289.98, 199.98, 45),
    subscriptionMrr: metric(119.96, 89.97, 33.3),
    arr: metric(1439.52, 1079.64, 33.3),
    activeSubscribers: metric(4, 3, 33.3),
    refundAmount: metric(9.99, 0, null),
  },
  charts: {
    trend: [{ dateLabel: "Sep 2026", amount: 299.97, previousAmount: 199.98 }],
    byPlan: [
      {
        planName: "Creator",
        amount: 299.97,
        percentage: 100,
        purchaseCount: 3,
        uniqueCustomers: 2,
        arpu: 149.985,
        retentionBase: 0,
        retentionRate: null,
        previousAmount: 0,
        percentageChange: null,
      },
    ],
  },
  insights: {
    subscriptionAnalytics: {
      points: [{ dateLabel: "Sep 01", newSubscriptions: 2, renewals: 1, cancellations: 0 }],
      newSubscriptions: metric(2, 1, 100),
      renewals: metric(1, 0, null),
      cancellations: metric(1, 0, null),
      churnRate: metric(6.9, 8.8, -1.9),
      hasChurnRate: true,
      activeAtPeriodStart: 3,
    },
    forecast: {
      points: [],
      currentMrr: 0,
      projectedGrowthRate: 0,
      status: "insufficient",
      sampleWeeks: 3,
      rSquared: 0,
      weeklyTrend: 0,
    },
    financialAlerts: [
      { id: "stuck-checkouts", type: "warning", title: "Unconfirmed checkouts", description: "2 checkouts, \"stuck\"", amount: 39.98, amountLabel: "pending", scope: "Now", actionStatus: "pending" },
    ],
  },
  transactions: [
    {
      id: "1",
      invoiceNumber: "INV-1",
      userId: "92d14e41-0000-4000-8000-000000000001",
      customerName: "Nguyễn An",
      customerEmail: "an@shop.vn",
      planName: "Creator",
      amount: 29.99,
      status: "paid",
      paymentDate: "2026-09-12",
      paymentMethod: "PayOS",
    },
  ],
  transactionFilter: { status: "paid" },
};

test("the previous period is the equally long window right before", () => {
  assert.deepEqual(previousPeriod("2026-09-01", "2026-09-30"), { start: "2026-08-02", end: "2026-08-31" });
  assert.deepEqual(previousPeriod("2026-01-01", "2026-10-23"), { start: "2025-03-11", end: "2025-12-31" });
});

test("the report converts invoice units to whole VND and reports churn in percentage points", () => {
  const sections = buildRevenueReport(input);
  const metrics = sections.find((s) => s.title === "Key Metrics")!;

  assert.deepEqual(metrics.rows[0], ["Total revenue (VND)", 299970, 199980, "+50%"]);
  assert.deepEqual(metrics.rows[5], ["Refunds (VND)", 9990, 0, "New"]);
  assert.deepEqual(metrics.rows.at(-1), ["Churn rate (% per month)", 6.9, 8.8, "-1.9 pp"]);

  const transactions = sections.at(-1)!;
  assert.equal(transactions.title, "Transactions (1)");
  assert.deepEqual(transactions.rows[0].slice(0, 2), ["INV-1", "92d14e41-0000-4000-8000-000000000001"]);
  assert.equal(transactions.rows[0][5], 29990);
});

test("sections without data are left out instead of exported empty", () => {
  const sheets = buildRevenueReport(input).map((s) => s.sheet);

  assert.ok(!sheets.includes("Forecast"), "an insufficient forecast has nothing to export");
  assert.deepEqual(
    [...new Set(sheets)],
    ["Summary", "By Plan", "Revenue Trend", "Subscriptions", "Alerts", "Transactions"]
  );
});

test("USD keeps the invoice amounts as they are", () => {
  const sections = buildRevenueReport({ ...input, currency: "USD" });
  assert.equal(sections.at(-1)!.rows[0][5], 29.99);
  assert.equal(sections.find((s) => s.title === "Key Metrics")!.rows[0][0], "Total revenue (USD)");
});

test("the CSV stacks every section, starts with a BOM and quotes text that needs it", () => {
  const csv = toCsv(buildRevenueReport(input));

  assert.ok(csv.startsWith("\uFEFFRevenue Report\r\n"));
  assert.ok(csv.includes("\r\n\r\nKey Metrics\r\nMetric,Current period,Previous period,Change\r\n"));
  assert.ok(csv.includes('"2 checkouts, ""stuck"""'));
  assert.ok(csv.includes("Transactions filter,status Paid"));
  assert.ok(csv.includes("INV-1,92d14e41-0000-4000-8000-000000000001,Nguyễn An,an@shop.vn,Creator,29990,PayOS,Paid,"));
});

test("the Excel workbook has one sheet per section group with typed cells", async () => {
  const blob = await toXlsx(buildRevenueReport(input), "VND");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());

  assert.deepEqual(
    workbook.worksheets.map((w) => w.name),
    ["Summary", "By Plan", "Revenue Trend", "Subscriptions", "Alerts", "Transactions"]
  );

  const transactions = workbook.getWorksheet("Transactions")!;
  assert.equal(transactions.getCell("A1").value, "Transactions (1)");
  assert.equal(transactions.getCell("B3").value, "92d14e41-0000-4000-8000-000000000001");
  assert.equal(transactions.getCell("F3").value, 29990);
  assert.equal(transactions.getCell("F3").numFmt, '#,##0" ₫"');

  // Summary holds two tables, so Key Metrics starts after the report info and a blank row.
  const summary = workbook.getWorksheet("Summary")!;
  assert.equal(summary.getCell("A10").value, "Key Metrics");
});
