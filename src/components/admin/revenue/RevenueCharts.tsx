"use client";

import React, { useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, PieChart as PieIcon, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RevenueChartDto } from "@/types/revenue";
import { formatCompactNumber, formatCompactVnd, formatCurrency } from "@/utils/format-currency";

interface RevenueChartsProps {
  charts?: RevenueChartDto;
  isLoading: boolean;
  currency?: "VND" | "USD";
}

// Plan colors matching standard SaaS palette:
// Studio: Violet (#8b5cf6) | Creator: Sky Blue (#0ea5e9) | Starter: Coral Red (#f43f5e) | Pro: Indigo (#6366f1) | Enterprise: Emerald (#10b981)
const PLAN_COLORS: Record<string, string> = {
  Studio: "#8b5cf6",
  Creator: "#0ea5e9",
  Starter: "#f43f5e",
  Pro: "#6366f1",
  Enterprise: "#10b981",
};

const DEFAULT_COLORS = ["#8b5cf6", "#0ea5e9", "#f43f5e", "#6366f1", "#10b981", "#f59e0b", "#ec4899"];

export function RevenueCharts({
  charts,
  isLoading,
  currency = "VND",
}: RevenueChartsProps) {
  const [planViewMode, setPlanViewMode] = useState<"donut" | "bar">("donut");

  if (isLoading || !charts) {
    return (
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="pb-2">
            <div className="h-5 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="dark:bg-slate-850 mt-1 h-3 w-60 animate-pulse rounded bg-slate-100" />
          </CardHeader>
          <CardContent className="h-[340px] p-6 pt-2">
            <div className="h-full w-full animate-pulse rounded-xl bg-slate-100/70 dark:bg-slate-800/40" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="pb-2">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="dark:bg-slate-850 mt-1 h-3 w-52 animate-pulse rounded bg-slate-100" />
          </CardHeader>
          <CardContent className="h-[340px] p-6 pt-2">
            <div className="h-full w-full animate-pulse rounded-xl bg-slate-100/70 dark:bg-slate-800/40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPlanColor = (planName: string, index: number) => {
    return PLAN_COLORS[planName] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  // 1. Trend Chart Data (2 lines: Current vs Previous)
  const trendData = charts.trend.map((point) => ({
    dateLabel: point.dateLabel,
    amount: point.amount,
    previousAmount: point.previousAmount ?? 0,
  }));

  // 2. Extract distinct plan names for Bar Chart
  const planNames = Array.from(
    new Set([
      ...(charts.availablePlans || []),
      ...charts.byPlan.map((p) => p.planName),
      ...charts.trend.flatMap((t) => Object.keys(t.planBreakdown || {})),
    ])
  );

  const barChartData = charts.trend.map((point) => {
    const item: Record<string, unknown> = {
      dateLabel: point.dateLabel,
      totalAmount: point.amount,
    };

    planNames.forEach((plan) => {
      if (point.planBreakdown) {
        const entry = Object.entries(point.planBreakdown).find(
          ([k]) => k.toLowerCase() === plan.toLowerCase()
        );
        item[plan] = entry ? Number(entry[1]) : 0;
      } else {
        item[plan] = 0;
      }
    });

    return item;
  });

  const totalPlanRevenue = charts.byPlan.reduce((acc, curr) => acc + curr.amount, 0);
  const topPlan = charts.byPlan.length > 0 ? charts.byPlan[0] : null;

  return (
    <div className="mb-6 grid gap-6 lg:grid-cols-2">
      {/* ======================================================== */}
      {/* 1. REVENUE GROWTH TREND (Line Chart 2 Đường So Sánh)      */}
      {/* ======================================================== */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-col gap-2 p-0 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Revenue Growth Trend
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Current vs. previous period comparison
            </p>
          </div>

          {/* Legend Pills */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <span className="h-0.5 w-3.5 border-b-2 border-dashed border-slate-400" />
              <span>Previous</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="h-[320px] w-full">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">
                No revenue records in this timeframe.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 12, right: 18, left: -14, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAmountArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
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
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(val) =>
                      currency === "VND" ? formatCompactVnd(val) : formatCompactNumber(val)
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const currentVal = Number(
                        payload.find((p) => p.dataKey === "amount")?.value || 0
                      );
                      const prevVal = Number(
                        payload.find((p) => p.dataKey === "previousAmount")?.value || 0
                      );
                      const diff = currentVal - prevVal;
                      const pctChange =
                        prevVal > 0 ? (diff / prevVal) * 100 : currentVal > 0 ? 100 : 0;
                      const isUp = pctChange >= 0;

                      return (
                        <div className="min-w-[200px] rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                          <p className="mb-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                            {label}
                          </p>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-sky-500" />
                                <span className="font-medium text-slate-500 dark:text-slate-400">
                                  Current:
                                </span>
                              </div>
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(currentVal, currency)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                <span className="font-medium text-slate-400 dark:text-slate-500">
                                  Previous:
                                </span>
                              </div>
                              <span className="font-semibold text-slate-600 dark:text-slate-400">
                                {formatCurrency(prevVal, currency)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 dark:border-slate-800">
                              <span className="text-[11px] font-medium text-slate-400">
                                Comparison:
                              </span>
                              <span
                                className={`inline-flex items-center text-xs font-bold ${
                                  isUp
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {isUp ? (
                                  <ArrowUpRight className="mr-0.5 h-3.5 w-3.5 stroke-[2.5]" />
                                ) : (
                                  <ArrowDownRight className="mr-0.5 h-3.5 w-3.5 stroke-[2.5]" />
                                )}
                                {Math.abs(pctChange).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {/* Current Period Line */}
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Current Period"
                    stroke="#0ea5e9"
                    strokeWidth={2.8}
                    dot={{ r: 4, fill: "#0ea5e9", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#0ea5e9", strokeWidth: 2, stroke: "#fff" }}
                  />
                  {/* Previous Period Line */}
                  <Line
                    type="monotone"
                    dataKey="previousAmount"
                    name="Previous Period"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: "#94a3b8", strokeWidth: 1.5, stroke: "#fff" }}
                    activeDot={{ r: 5, fill: "#94a3b8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* 2. REVENUE BY PLAN (Donut Chart + Plan Performance List) */}
      {/* ======================================================== */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between p-0 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Revenue by Plan
              </CardTitle>
              {topPlan && topPlan.amount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                  <Sparkles className="h-3 w-3" />
                  Top: {topPlan.planName}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Plan distribution & performance breakdown
            </p>
          </div>

          {/* Toggle Donut vs Stacked Bar */}
          <div className="dark:bg-slate-850 flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/90 p-1 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPlanViewMode("donut")}
              aria-label="View as Donut chart"
              className={`cursor-pointer rounded-lg p-1.5 transition-all ${
                planViewMode === "donut"
                  ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <PieIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPlanViewMode("bar")}
              aria-label="View as Bar chart"
              className={`cursor-pointer rounded-lg p-1.5 transition-all ${
                planViewMode === "bar"
                  ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="h-[320px] w-full">
            {charts.byPlan.length === 0 || totalPlanRevenue === 0 ? (
              <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">
                No plan subscription revenue in this period.
              </div>
            ) : planViewMode === "donut" ? (
              /* --- DONUT CHART + PLAN RANKING VIEW --- */
              <div className="grid h-full grid-cols-1 items-center gap-4 sm:grid-cols-12">
                {/* Donut Chart with Center Total */}
                <div className="relative flex h-[280px] w-full items-center justify-center sm:col-span-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const data = payload[0].payload as {
                            planName: string;
                            amount: number;
                            percentage: number;
                          };
                          return (
                            <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {data.planName}
                              </p>
                              <p className="mt-1 text-xs font-extrabold text-sky-600 dark:text-sky-400">
                                {formatCurrency(data.amount, currency)}
                              </p>
                              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                                Share: {data.percentage}%
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Pie
                        data={charts.byPlan}
                        dataKey="amount"
                        nameKey="planName"
                        innerRadius={56}
                        outerRadius={84}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {charts.byPlan.map((entry, index) => (
                          <Cell
                            key={entry.planName}
                            fill={getPlanColor(entry.planName, index)}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Metric */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Total
                    </span>
                    <span className="mt-0.5 text-xs font-extrabold text-slate-900 sm:text-sm dark:text-slate-100">
                      {formatCurrency(totalPlanRevenue, currency)}
                    </span>
                  </div>
                </div>

                {/* Plan Performance Breakdown List */}
                <div className="flex flex-col justify-center space-y-3.5 pr-2 sm:col-span-7">
                  {charts.byPlan.map((plan, idx) => {
                    const color = getPlanColor(plan.planName, idx);
                    const isTop = idx === 0 && plan.amount > 0;

                    return (
                      <div key={plan.planName} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {plan.planName}
                            </span>
                            {isTop && (
                              <span className="py-0.2 rounded-sm bg-amber-100/80 px-1 text-[9px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                Top
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(plan.amount, currency)}
                            </span>
                            <span className="w-9 text-right font-semibold text-slate-400">
                              {plan.percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.max(3, plan.percentage))}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* --- STACKED BAR CHART VIEW --- */
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 12, right: 18, left: -14, bottom: 0 }}
                >
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
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(val) =>
                      currency === "VND" ? formatCompactVnd(val) : formatCompactNumber(val)
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const validItems = payload.filter(
                        (p) => p.value != null && Number(p.value) > 0
                      );
                      if (validItems.length === 0) return null;

                      return (
                        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                          <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                            {label}
                          </p>
                          <div className="space-y-1.5">
                            {validItems.map((entry) => (
                              <div
                                key={String(entry.name)}
                                className="flex items-center justify-between gap-4 text-xs"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="font-medium text-slate-600 dark:text-slate-300">
                                    {String(entry.name)}:
                                  </span>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(Number(entry.value), currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {value}
                      </span>
                    )}
                  />
                  {planNames.map((plan, index) => (
                    <Bar
                      key={plan}
                      dataKey={plan}
                      name={plan}
                      fill={getPlanColor(plan, index)}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
