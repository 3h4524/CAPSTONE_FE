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

// The API sends every amount in full VND: USD prices at the PayOS rate (25,000 here).
const input: RevenueReportInput = {
  filter: { startDate: "2026-09-01", endDate: "2026-09-30", granularity: "Month" },
  generatedAt: new Date("2026-10-23T05:00:00Z"),
  metrics: {
    totalRevenue: metric(7_499_250, 4_999_500, 50),
    netRevenue: metric(7_249_500, 4_999_500, 45),
    subscriptionMrr: metric(2_999_000, 2_249_250, 33.3),
    arr: metric(35_988_000, 26_991_000, 33.3),
    activeSubscribers: metric(4, 3, 33.3),
    refundAmount: metric(249_750, 0, null),
  },
  charts: {
    trend: [{ dateLabel: "Sep 2026", amount: 7_499_250, previousAmount: 4_999_500 }],
    byPlan: [
      {
        planName: "Creator",
        amount: 7_499_250,
        percentage: 100,
        purchaseCount: 3,
        uniqueCustomers: 2,
        arpu: 3_749_625,
        customers: { start: 3, stayed: 2, switchedOut: 0, stoppedPaying: 1, new: 2, switchedIn: 0, end: 4 },
        retentionRate: null,
        previousAmount: 0,
        percentageChange: null,
        mrrStart: 2_249_250,
        mrrEnd: 2_999_000,
        mrrChangePercent: 33.33,
        usageSignal: { stayed: 2, left: 1, minimumGroup: 10, hasSignal: false, feature: null, featureLabel: null, stayedRate: null, leftRate: null },
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
      { id: "stuck-checkouts", type: "warning", title: "Unconfirmed checkouts", description: "2 checkouts, \"stuck\"", amount: 999_500, amountLabel: "pending", scope: "Now", actionStatus: "pending" },
    ],
    mrrMovement: {
      months: [{ monthStart: "2026-09-01", new: 1_499_500, expansion: 0, contraction: 0, churn: 749_750, net: 749_750 }],
      period: [
        { planName: null, start: 2_249_250, new: 1_499_500, movedIn: 0, expansion: 0, contraction: 0, movedOut: 0, churn: 749_750, end: 2_999_000 },
      ],
    },
  },
  transactions: [
    {
      id: "1",
      invoiceNumber: "INV-1",
      userId: "92d14e41-0000-4000-8000-000000000001",
      customerName: "Nguyễn An",
      customerEmail: "an@shop.vn",
      planName: "Creator",
      amount: 749_750,
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

test("the report keeps amounts in VND and reports churn in percentage points", () => {
  const sections = buildRevenueReport(input);
  const metrics = sections.find((s) => s.title === "Key Metrics")!;

  assert.deepEqual(metrics.rows[0], ["Total revenue (VND)", 7_499_250, 4_999_500, "+50%"]);
  assert.deepEqual(metrics.rows[5], ["Refunds (VND)", 249_750, 0, "New"]);
  assert.deepEqual(metrics.rows.at(-1), ["Churn rate (% per month)", 6.9, 8.8, "-1.9 pp"]);

  const transactions = sections.at(-1)!;
  assert.equal(transactions.title, "Transactions (1)");
  assert.deepEqual(transactions.rows[0].slice(0, 2), ["INV-1", "92d14e41-0000-4000-8000-000000000001"]);
  assert.equal(transactions.rows[0][5], 749_750);
});

test("the plan table carries customers at both ends, MRR change and the usage line", () => {
  const byPlan = buildRevenueReport(input).find((s) => s.title === "Revenue by Plan")!;

  assert.deepEqual(byPlan.rows[0].slice(7), [
    3,
    4,
    null,
    2_249_250,
    2_999_000,
    "+33.3%",
    "Not enough customers to compare usage: 1 left and 2 stayed, at least 10 of each needed. Pick a longer period.",
  ]);
});

test("MRR movement is exported per plan and per month", () => {
  const sections = buildRevenueReport(input).filter((s) => s.sheet === "MRR Movement");

  assert.equal(sections.length, 2);
  assert.deepEqual(sections[0].rows[0], ["All plans", 2_249_250, 1_499_500, 0, 0, 0, 0, 749_750, 2_999_000]);
  assert.deepEqual(sections[1].rows[0], ["2026-09-01", 1_499_500, 0, 0, 749_750, 749_750]);
});

test("sections without data are left out instead of exported empty", () => {
  const sheets = buildRevenueReport(input).map((s) => s.sheet);

  assert.ok(!sheets.includes("Forecast"), "an insufficient forecast has nothing to export");
  assert.deepEqual(
    [...new Set(sheets)],
    ["Summary", "By Plan", "MRR Movement", "Revenue Trend", "Subscriptions", "Alerts", "Transactions"]
  );
});

test("the CSV stacks every section, starts with a BOM and quotes text that needs it", () => {
  const csv = toCsv(buildRevenueReport(input));

  assert.ok(csv.startsWith("﻿Revenue Report\r\n"));
  assert.ok(csv.includes("\r\n\r\nKey Metrics\r\nMetric,Current period,Previous period,Change\r\n"));
  assert.ok(csv.includes('"2 checkouts, ""stuck"""'));
  assert.ok(csv.includes("Transactions filter,status Paid"));
  assert.ok(csv.includes("Currency,VND"));
  assert.ok(csv.includes("INV-1,92d14e41-0000-4000-8000-000000000001,Nguyễn An,an@shop.vn,Creator,749750,PayOS,Paid,"));
});

test("the Excel workbook has one sheet per section group with typed cells", async () => {
  const blob = await toXlsx(buildRevenueReport(input));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());

  assert.deepEqual(
    workbook.worksheets.map((w) => w.name),
    ["Summary", "By Plan", "MRR Movement", "Revenue Trend", "Subscriptions", "Alerts", "Transactions"]
  );

  const transactions = workbook.getWorksheet("Transactions")!;
  assert.equal(transactions.getCell("A1").value, "Transactions (1)");
  assert.equal(transactions.getCell("B3").value, "92d14e41-0000-4000-8000-000000000001");
  assert.equal(transactions.getCell("F3").value, 749_750);
  assert.equal(transactions.getCell("F3").numFmt, '#,##0" ₫"');

  // Summary holds two tables, so Key Metrics starts after the report info and a blank row.
  const summary = workbook.getWorksheet("Summary")!;
  assert.equal(summary.getCell("A10").value, "Key Metrics");
});
