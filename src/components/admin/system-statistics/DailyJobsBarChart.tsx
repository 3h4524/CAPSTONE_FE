"use client";

import React, { useMemo } from "react";
import { BarChart2, Calendar, CalendarDays } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useIsPhone } from "@/hooks/use-is-phone";
import type { DailyJobsPointDto } from "@/types/system-statistics";

import { formatDateLabel, movingAverage } from "./statistics-insights";

interface DailyJobsBarChartProps {
  dailyJobs?: DailyJobsPointDto[];
  isLoading: boolean;
  periodEnd?: string;
}

interface ChartPoint extends DailyJobsPointDto {
  ma7: number | null;
  isToday: boolean;
  isPeak: boolean;
}

const BAR_COLOR = "var(--ink-400)";
const TODAY_COLOR = "var(--ink-300)";
const PEAK_COLOR = "#f97316";
const TREND_COLOR = "var(--ink-900)";

// The row around the chart only sets a minimum height on a phone, which a percentage cannot follow.
const PHONE_CHART_HEIGHT = 300;

export function DailyJobsBarChart({
  dailyJobs = [],
  isLoading,
  periodEnd,
}: DailyJobsBarChartProps) {
  const isPhone = useIsPhone();
  const stats = useMemo(() => {
    if (dailyJobs.length === 0) {
      return { total: 0, avg: 0, peakIndex: -1, peak: { date: "-", count: 0 } };
    }
    const total = dailyJobs.reduce((sum, item) => sum + item.count, 0);
    const avg = Math.round((total / dailyJobs.length) * 10) / 10;
    const peakIndex = dailyJobs.reduce(
      (maxIdx, item, idx) => (item.count > dailyJobs[maxIdx].count ? idx : maxIdx),
      0
    );
    const peak = dailyJobs[peakIndex];
    return { total, avg, peakIndex, peak: { date: peak.dateLabel, count: peak.count } };
  }, [dailyJobs]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const ma7 = movingAverage(dailyJobs);
    return dailyJobs.map((point, i) => ({
      ...point,
      ma7: ma7[i],
      isToday: point.dateLabel === periodEnd,
      isPeak: i === stats.peakIndex && point.count > 0,
    }));
  }, [dailyJobs, periodEnd, stats.peakIndex]);

  const isEmpty = dailyJobs.length === 0;
  const hasTrendLine = chartData.some((p) => p.ma7 !== null);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartPoint }>;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const point = payload[0].payload;
    const diff = point.count - stats.avg;

    return (
      <div className="border-ink-200/90 bg-card rounded-xl border px-3.5 py-2.5 shadow-md">
        <div className="text-ink-400 flex items-center gap-1.5 text-[11px] font-medium">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDateLabel(point.dateLabel, { weekday: "short", month: "short", day: "numeric" })}
            {point.isToday && " · in progress"}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-ink-900 text-lg font-bold tracking-tight">
            {point.count.toLocaleString()}
          </span>
          <span className="text-ink-500 text-xs">jobs</span>
        </div>
        <div className="text-ink-500 mt-1 space-y-0.5 text-[11px]">
          <div>
            <span className={diff >= 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold"}>
              {diff >= 0 ? "+" : "−"}
              {Math.abs(diff).toFixed(1)}
            </span>{" "}
            vs period average
          </div>
          {point.ma7 !== null && <div>7-day average: {point.ma7}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="border-ink-200/80 bg-card flex h-full flex-col rounded-2xl border p-5 shadow-2xs max-md:p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <div className="bg-ink-100 text-ink-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-ink-900 text-sm font-bold">Daily batch jobs</h3>
            {isLoading ? (
              <div className="bg-ink-100 mt-1 h-3.5 w-52 animate-pulse rounded" />
            ) : (
              !isEmpty && (
                <p className="text-ink-500 text-xs">
                  {dailyJobs.length} days · avg <span className="text-ink-700 font-semibold">{stats.avg}</span>/day
                  {stats.peak.count > 0 && (
                    <>
                      {" "}· peak <span className="text-ink-700 font-semibold">{stats.peak.count}</span> on{" "}
                      {formatDateLabel(stats.peak.date)}
                    </>
                  )}
                </p>
              )
            )}
          </div>
        </div>

        {!isEmpty && !isLoading && (
          <div className="text-ink-500 flex flex-wrap items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAR_COLOR }} />
              Jobs per day
            </span>
            {hasTrendLine && (
              <span className="flex items-center gap-1.5">
                <span className="bg-ink-900 h-0.5 w-3.5 rounded-full" />
                7-day average
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PEAK_COLOR }} />
              Peak day
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 min-h-[300px] w-full flex-1">
        {isLoading ? (
          <div className="flex h-full items-end gap-2 px-2 pb-6">
            {[35, 55, 25, 75, 45, 90, 60, 40, 65, 80, 50, 70].map((h, i) => (
              <div
                key={i}
                className="bg-ink-100 w-full animate-pulse rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
            <div className="bg-ink-100 text-ink-400 rounded-xl p-3">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-ink-700 text-sm font-medium">
                No batch jobs in this timeframe
              </p>
              <p className="text-ink-400 text-xs">
                Jobs will appear here as sellers start generation runs.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={isPhone ? PHONE_CHART_HEIGHT : "100%"}>
            <ComposedChart data={chartData} margin={{ top: 22, right: 12, left: -22, bottom: 0 }} barCategoryGap={3}>
              <CartesianGrid vertical={false} stroke="var(--ink-100)" />
              <XAxis
                dataKey="dateLabel"
                axisLine={{ stroke: "var(--ink-200)" }}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--ink-400)" }}
                dy={6}
                minTickGap={14}
                tickFormatter={(val: string) => formatDateLabel(val)}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--ink-400)" }}
              />
              <Tooltip cursor={{ fill: "rgba(15, 23, 42, 0.04)" }} content={<CustomTooltip />} />
              {stats.avg > 0 && (
                <ReferenceLine
                  y={stats.avg}
                  stroke="var(--ink-400)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{ value: "avg", position: "insideTopLeft", fontSize: 10, fill: "var(--ink-400)" }}
                />
              )}
              <Bar dataKey="count" name="Jobs" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPeak ? PEAK_COLOR : entry.isToday ? TODAY_COLOR : BAR_COLOR}
                  />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  offset={6}
                  className="fill-ink-900 text-xs font-bold"
                  formatter={(value) => (value === stats.peak.count && stats.peak.count > 0 ? String(value) : "")}
                />
              </Bar>
              {hasTrendLine && (
                <Line
                  type="monotone"
                  dataKey="ma7"
                  name="7-day average"
                  stroke={TREND_COLOR}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
