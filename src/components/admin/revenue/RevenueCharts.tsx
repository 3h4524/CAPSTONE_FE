"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RevenueChartDto } from "@/types/revenue";
import { formatCompactVnd, formatCurrencyVnd } from "@/utils/format-currency";

interface RevenueChartsProps {
  charts?: RevenueChartDto;
  isLoading: boolean;
}

// Plan colors matching the exact palette from the user's image:
// Creator: Sky Blue (#0ea5e9) | Starter: Coral Red (#f43f5e) | Studio: Violet (#8b5cf6)
const PLAN_COLORS: Record<string, string> = {
  Creator: "#0ea5e9",
  Starter: "#f43f5e",
  Studio: "#8b5cf6",
  Pro: "#6366f1",
  Enterprise: "#10b981",
};

const DEFAULT_COLORS = ["#0ea5e9", "#f43f5e", "#8b5cf6", "#10b981", "#f59e0b"];

export function RevenueCharts({ charts, isLoading }: RevenueChartsProps) {
  if (isLoading || !charts) {
    return (
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="border-none shadow-sm dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue Growth Trend</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[350px] items-center justify-center">
            <div className="flex h-full w-full animate-pulse items-end space-x-4 px-4 pb-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-full rounded-t bg-slate-200 dark:bg-slate-800"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[350px] items-center justify-center">
            <div className="flex h-full w-full animate-pulse items-end space-x-4 px-4 pb-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-full rounded-t bg-slate-200 dark:bg-slate-800"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract all distinct plan names
  const planNames = Array.from(
    new Set([
      ...(charts.availablePlans || []),
      ...charts.byPlan.map((p) => p.planName),
      ...charts.trend.flatMap((t) => Object.keys(t.planBreakdown || {})),
    ])
  );

  // Transform trend data for the Revenue by Plan BarChart
  const barChartData = charts.trend.map((point) => {
    const item: Record<string, unknown> = {
      dateLabel: point.dateLabel,
      totalAmount: point.amount,
    };

    planNames.forEach((plan) => {
      if (point.planBreakdown) {
        // Case-insensitive lookup in planBreakdown
        const entry = Object.entries(point.planBreakdown).find(
          ([k]) => k.toLowerCase() === plan.toLowerCase()
        );
        const val = entry ? Number(entry[1]) : 0;
        // When there is no revenue for this plan in this period, set to null so no bar is rendered
        item[plan] = val > 0 ? val : null;
      } else {
        item[plan] = null;
      }
    });

    return item;
  });

  const getPlanColor = (planName: string, index: number) => {
    return PLAN_COLORS[planName] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      {/* 1. Revenue Growth Trend (Line Chart giữ nguyên) */}
      <Card className="border-none bg-white shadow-sm dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue Growth Trend</CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={charts.trend}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="dateLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(value) => formatCompactVnd(value)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const val = Number(payload[0]?.value || 0);
                    return (
                      <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-md dark:border-slate-800 dark:bg-slate-900">
                        <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {label}
                        </p>
                        <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                          Revenue: {formatCurrencyVnd(val)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#0ea5e9", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Revenue by Plan (Bar Chart theo gói và thời gian) */}
      <Card className="border-none bg-white shadow-sm dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue by Plan</CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[350px] w-full">
            {barChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                No revenue data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="dateLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(value) => formatCompactVnd(value)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      // Chỉ hiện các gói có phát sinh doanh thu > 0 trong kỳ này
                      const validItems = payload.filter(
                        (p) => p.value != null && Number(p.value) > 0
                      );
                      if (validItems.length === 0) return null;

                      return (
                        <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-md dark:border-slate-800 dark:bg-slate-900">
                          <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
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
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="font-medium text-slate-600 dark:text-slate-300">
                                    {String(entry.name)}:
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {formatCurrencyVnd(Number(entry.value))}
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
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
