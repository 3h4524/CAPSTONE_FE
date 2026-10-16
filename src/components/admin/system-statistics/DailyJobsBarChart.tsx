"use client";

import React, { useMemo } from "react";
import { Activity, BarChart2, Calendar, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyJobsPointDto } from "@/types/system-statistics";

interface DailyJobsBarChartProps {
  dailyJobs?: DailyJobsPointDto[];
  isLoading: boolean;
}

export function DailyJobsBarChart({
  dailyJobs = [],
  isLoading,
}: DailyJobsBarChartProps) {
  // Compute business insights from the daily dataset
  const stats = useMemo(() => {
    if (!dailyJobs || dailyJobs.length === 0) {
      return { total: 0, avg: 0, peak: { date: "-", count: 0 } };
    }
    const total = dailyJobs.reduce((sum, item) => sum + item.count, 0);
    const avg = Math.round((total / dailyJobs.length) * 10) / 10;
    const peak = dailyJobs.reduce(
      (max, item) => (item.count > max.count ? item : max),
      { dateLabel: "-", count: 0 }
    );
    return { total, avg, peak: { date: peak.dateLabel, count: peak.count } };
  }, [dailyJobs]);

  if (isLoading) {
    return (
      <Card className="border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3.5 w-60 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
            <div className="h-7 w-24 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex h-[320px] items-end space-x-2 px-4 pb-4">
            {[35, 55, 25, 75, 45, 90, 60, 40, 65, 80, 50, 70].map((h, i) => (
              <div
                key={i}
                className="w-full rounded-t bg-slate-100 dark:bg-slate-800"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEmpty = dailyJobs.length === 0;

  // Custom refined tooltip (clean, minimal, human-designed)
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const count = payload[0]?.value ?? 0;
    let formattedDate = label || "";
    try {
      if (label) {
        const d = new Date(label);
        formattedDate = new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(d);
      }
    } catch {
      formattedDate = label || "";
    }

    return (
      <div className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-lg shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <Calendar className="h-3 w-3" />
          <span>{formattedDate}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {count.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">jobs processed</span>
        </div>
        {stats.avg > 0 && (
          <div className="mt-1.5 border-t border-slate-100 pt-1 text-[11px] text-slate-400 dark:border-slate-800">
            {count >= stats.avg ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                +{(count - stats.avg).toFixed(1)} vs daily average
              </span>
            ) : (
              <span className="font-medium text-slate-500">
                -{(stats.avg - count).toFixed(1)} vs daily average
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100/80 pb-4 dark:border-slate-800/80">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Daily Batch Job Volume
              </CardTitle>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {dailyJobs.length} days
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Execution frequency and operational workload over time
            </p>
          </div>

          {!isEmpty && (
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 rounded-md border border-slate-200/70 bg-slate-50/70 px-2.5 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <Activity className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  Avg: <strong className="font-semibold text-slate-800 dark:text-slate-200">{stats.avg}</strong> /day
                </span>
              </div>
              {stats.peak.count > 0 && (
                <div className="hidden items-center gap-1.5 rounded-md border border-slate-200/70 bg-slate-50/70 px-2.5 py-1 text-slate-600 sm:flex dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Peak: <strong className="font-semibold text-slate-800 dark:text-slate-200">{stats.peak.count}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="h-[320px] w-full">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
              <div className="rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">
                <BarChart2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  No batch jobs in this timeframe
                </p>
                <p className="text-xs text-slate-400">
                  Jobs will populate here automatically as sellers trigger generative tasks.
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyJobs}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#334155" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#475569" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                  className="stroke-slate-100 dark:stroke-slate-800/60"
                />
                <XAxis
                  dataKey="dateLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  dy={8}
                  tickFormatter={(val) => {
                    try {
                      const d = new Date(val);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    } catch {
                      return val;
                    }
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                  content={<CustomTooltip />}
                />
                {stats.avg > 0 && (
                  <ReferenceLine
                    y={stats.avg}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                )}
                <Bar
                  dataKey="count"
                  name="Jobs"
                  fill="url(#barGradient)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
