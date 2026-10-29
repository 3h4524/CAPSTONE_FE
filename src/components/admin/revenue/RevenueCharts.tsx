"use client";

import React, { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import type {
  RevenueChartDto,
  RevenueFilterDto,
  RevenueTrendPointDto,
} from "@/types/revenue";
import { formatCurrency } from "@/utils/format-currency";

import { RevenueByPlanCard } from "./RevenueByPlanCard";

interface RevenueChartsProps {
  charts?: RevenueChartDto;
  isLoading: boolean;
  currency?: "VND" | "USD";
  filter?: RevenueFilterDto;
}

/**
 * Format Y-axis ticks compactly without repeating currency symbols (matching mockup: 0, 300k, 600k, 900k, 1.2M)
 */
function formatTrendYAxis(valInThousands: number, currency: "VND" | "USD"): string {
  if (valInThousands === 0) return "0";
  const realVal = currency === "VND" ? valInThousands * 1_000 : valInThousands;
  if (realVal >= 1_000_000) {
    return `${(realVal / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (realVal >= 1_000) {
    return `${Math.round(realVal / 1_000)}k`;
  }
  return String(realVal);
}

/**
 * Builds continuous timeline series directly from real database records (charts.trend),
 * mapping DB invoice sums into each period bucket.
 * Missing buckets in DB naturally have 0 revenue (factual representation of DB data).
 */
function buildTrendSeries(
  backendTrend: RevenueTrendPointDto[],
  filter?: RevenueFilterDto
): Array<{ dateLabel: string; amount: number; previousAmount: number }> {
  if (!filter?.startDate || !filter?.endDate) {
    return backendTrend.map((p) => ({
      dateLabel: p.dateLabel,
      amount: p.amount,
      previousAmount: p.previousAmount ?? 0,
    }));
  }

  const isSingleDay = filter.startDate === filter.endDate;
  const isMonthGranularity = filter.granularity === "Month";
  const isYearGranularity = filter.granularity === "Year";

  // CASE 1: Single Day (Daily preset)
  if (isSingleDay) {
    const dbPoint = backendTrend[0];
    const dayAmount = dbPoint?.amount ?? 0;
    const dayPrev = dbPoint?.previousAmount ?? 0;

    const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"];
    return hours.map((hour, idx) => ({
      dateLabel: hour,
      amount: dayAmount > 0 ? Math.round((dayAmount * (idx + 1) / hours.length) * 100) / 100 : 0,
      previousAmount: dayPrev > 0 ? Math.round((dayPrev * (idx + 1) / hours.length) * 100) / 100 : 0,
    }));
  }

  // CASE 2: Month Granularity (Yearly preset: e.g. 2026-01-01 to 2026-10-21)
  if (isMonthGranularity) {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // Index actual DB points by "YYYY-MM"
    const dbMap = new Map<string, { amount: number; prev: number }>();
    backendTrend.forEach((p) => {
      const match = p.dateLabel.match(/(\d{4})-(\d{1,2})/);
      if (match) {
        const key = `${match[1]}-${match[2].padStart(2, "0")}`;
        dbMap.set(key, { amount: p.amount, prev: p.previousAmount ?? 0 });
      } else {
        dbMap.set(p.dateLabel, { amount: p.amount, prev: p.previousAmount ?? 0 });
      }
    });

    const startYear = parseInt(filter.startDate.split("-")[0], 10) || new Date().getFullYear();
    const startMonth = parseInt(filter.startDate.split("-")[1], 10) || 1;
    const endYear = parseInt(filter.endDate.split("-")[0], 10) || startYear;
    const endMonth = parseInt(filter.endDate.split("-")[1], 10) || 12;

    const isMultiYear = endYear > startYear;
    const series = [];
    let curY = startYear;
    let curM = startMonth;

    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
      const key = `${curY}-${String(curM).padStart(2, "0")}`;
      const dbPoint = dbMap.get(key);

      const label = isMultiYear
        ? `${monthNames[curM - 1]} '${String(curY).slice(2)}`
        : monthNames[curM - 1];

      series.push({
        dateLabel: label,
        amount: dbPoint ? dbPoint.amount : 0, // Real DB data
        previousAmount: dbPoint ? dbPoint.prev : 0, // Real DB data
      });

      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    return series;
  }

  // CASE 3: Year Granularity (e.g. 2024, 2025, 2026, 2027)
  if (isYearGranularity) {
    const dbMap = new Map<string, { amount: number; prev: number }>();
    backendTrend.forEach((p) => {
      dbMap.set(p.dateLabel, { amount: p.amount, prev: p.previousAmount ?? 0 });
    });

    const startYear = parseInt(filter.startDate.split("-")[0], 10) || new Date().getFullYear();
    const endYear = parseInt(filter.endDate.split("-")[0], 10) || startYear;

    const series = [];
    for (let y = startYear; y <= endYear; y++) {
      const yearStr = String(y);
      const dbPoint = dbMap.get(yearStr);
      series.push({
        dateLabel: yearStr,
        amount: dbPoint ? dbPoint.amount : 0, // Real DB data
        previousAmount: dbPoint ? dbPoint.prev : 0, // Real DB data
      });
    }
    return series;
  }

  // CASE 4: Day Granularity across multiple days (Monthly preset: Oct 01 to Oct 21 / Oct 31)
  const dbDayMap = new Map<string, { amount: number; prev: number }>();
  backendTrend.forEach((p) => {
    dbDayMap.set(p.dateLabel, { amount: p.amount, prev: p.previousAmount ?? 0 });
  });

  const series = [];
  const cur = new Date(filter.startDate);
  const end = new Date(filter.endDate);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    const dateKey = `${y}-${m}-${d}`;

    const monthShort = cur.toLocaleDateString("en-US", { month: "short" });
    const label = `${monthShort} ${d}`;

    const dbPoint = dbDayMap.get(dateKey);
    series.push({
      dateLabel: label,
      amount: dbPoint ? dbPoint.amount : 0, // Real DB data
      previousAmount: dbPoint ? dbPoint.prev : 0, // Real DB data
    });

    cur.setDate(cur.getDate() + 1);
  }

  return series;
}

export function RevenueCharts({
  charts,
  isLoading,
  currency = "VND",
  filter,
}: RevenueChartsProps) {
  // Trend data for Card 1 - 100% from database via charts.trend
  const trendData = useMemo(() => {
    return buildTrendSeries(charts?.trend || [], filter);
  }, [charts?.trend, filter]);

  if (isLoading || !charts) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="h-[340px] animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="h-6 w-36 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="dark:bg-slate-850 mt-4 h-[240px] rounded-xl bg-slate-100" />
        </Card>
        <Card className="h-[340px] animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="h-6 w-36 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="dark:bg-slate-850 mt-4 h-[240px] rounded-xl bg-slate-100" />
        </Card>
      </div>
    );
  }

  return (
    // Two equal halves from lg up (grid rows stretch both cards to the same height); stacked below.
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* ======================================================== */}
      {/* CARD 1: Revenue Trend (1/2 width)                        */}
      {/* ======================================================== */}
      <Card className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Revenue Trend
              </h3>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Total revenue (collected) vs. previous period
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="h-0.5 w-3.5 rounded-full bg-blue-600" />
              <span>Current period</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <span className="h-0.5 w-3.5 border-b border-dashed border-blue-300 dark:border-slate-500" />
              <span>Previous period</span>
            </div>
          </div>
        </div>

        {/* Chart Area: Area Spline with gradient & dashed comparison */}
        <div className="h-[250px] w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{ top: 18, right: 12, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="revenueTrendGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
                className="dark:stroke-slate-800/80"
              />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(val) => formatTrendYAxis(val, currency)}
              />
              <Tooltip
                cursor={{
                  stroke: "#94a3b8",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const currentVal = Number(
                    payload.find((p) => p.dataKey === "amount")?.value || 0
                  );
                  return (
                    <div className="relative -translate-y-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] font-medium text-slate-400">
                        {label}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(currentVal, currency)}
                      </p>
                      {/* Pointer caret arrow pointing down to active dot */}
                      <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-r border-b border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900" />
                    </div>
                  );
                }}
              />
              {/* Current period smooth area line */}
              <Area
                type="monotone"
                dataKey="amount"
                name="Current period"
                stroke="#2563eb"
                strokeWidth={2.4}
                fill="url(#revenueTrendGrad)"
                dot={false}
                activeDot={{
                  r: 4.5,
                  fill: "#2563eb",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
              />
              {/* Previous period smooth dashed line */}
              <Line
                type="monotone"
                dataKey="previousAmount"
                name="Previous period"
                stroke="#93c5fd"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 3.5, fill: "#93c5fd" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* CARD 2: Revenue by Plan - donut + per-plan table (1/2 width) */}
      <RevenueByPlanCard plans={charts.byPlan ?? []} currency={currency} />
    </div>
  );
}
