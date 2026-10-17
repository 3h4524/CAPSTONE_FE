"use client";

import React, { useMemo } from "react";
import { Activity, BarChart2, Calendar, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
    <Card className="rounded-lg border border-slate-200/90 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-slate-200/90 pb-3.5 dark:border-slate-800">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-bold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                Daily Batch Job Volume
              </CardTitle>
              <span className="inline-flex items-center rounded-sm border border-slate-300 bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {dailyJobs.length} DAYS
              </span>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Execution frequency and operational workload over time
            </p>
          </div>

          {!isEmpty && (
            <div className="flex items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-xs bg-[#1e293b] dark:bg-slate-200" />
                <span>
                  Avg: <strong className="font-mono font-bold text-slate-900 dark:text-slate-100">{stats.avg}</strong> /day
                </span>
              </div>
              {stats.peak.count > 0 && (
                <div className="flex items-center gap-1.5 rounded-sm border border-orange-300/80 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-[#c2410c] dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300">
                  <span className="h-1.5 w-1.5 rounded-xs bg-[#c2410c]" />
                  <span>
                    Peak: <strong className="font-mono font-bold text-[#c2410c] dark:text-orange-300">{stats.peak.count}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <div className="h-[320px] w-full">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
              <div className="rounded-md bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">
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
                <CartesianGrid
                  strokeDasharray="2 2"
                  vertical={false}
                  stroke="#e2e8f0"
                  className="stroke-slate-200/80 dark:stroke-slate-800"
                />
                <XAxis
                  dataKey="dateLabel"
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }}
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
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                  content={<CustomTooltip />}
                />
                {stats.avg > 0 && (
                  <ReferenceLine
                    y={stats.avg}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                )}
                <Bar
                  dataKey="count"
                  name="Jobs"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={30}
                >
                  {dailyJobs.map((entry, index) => {
                    const isPeak = entry.count === stats.peak.count && stats.peak.count > 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPeak ? "#c2410c" : "#1e293b"}
                        className={isPeak ? "transition-opacity hover:opacity-90" : "transition-opacity hover:opacity-85"}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
