"use client";

import React, { useState } from "react";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RevenueForecastDto } from "@/types/revenue";
import { formatCompactVndAmount, formatVnd } from "@/utils/format-currency";

interface RevenueForecastCardProps {
  data?: RevenueForecastDto;
  isLoading?: boolean;
}

type TimeHorizon = 3 | 6 | 12;

// The forecast is weekly; the selector stays in months and maps to whole weeks.
const HORIZON_WEEKS: Record<TimeHorizon, number> = { 3: 13, 6: 26, 12: 52 };

const MIN_WEEKS = 8;
const RELIABLE_WEEKS = 14;

export function RevenueForecastCard({
  data,
  isLoading,
}: RevenueForecastCardProps) {
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>(3);
  const { t } = useTranslation("common");

  const status = data?.status ?? "insufficient";
  const sampleWeeks = data?.sampleWeeks ?? 0;
  const showForecast = status === "ok";

  const allPoints = data?.points ?? [];
  const historical = allPoints.filter((p) => p.isHistorical);
  const future = showForecast
    ? allPoints.filter((p) => !p.isHistorical).slice(0, HORIZON_WEEKS[timeHorizon])
    : [];

  // The backend anchors the forecast on the last historical week; band is the 95% prediction interval.
  const chartData = [...historical, ...future].map((p) => {
    const hasForecast = showForecast && p.forecastBase != null;
    return {
      ...p,
      forecastBase: hasForecast ? p.forecastBase : null,
      optimistic: hasForecast ? p.optimistic : null,
      conservative: hasForecast ? p.conservative : null,
      band: hasForecast ? [p.conservative ?? 0, p.optimistic ?? 0] : null,
    };
  });

  const formatYAxis = (val: number) => formatCompactVndAmount(val);

  const weeklyTrend = data?.weeklyTrend ?? 0;
  const trendLabel = t("admin.revenue.forecast.trendPerWeek", {
    value: `${weeklyTrend >= 0 ? "+" : ""}${formatVnd(weeklyTrend)}`,
  });

  const warning =
    status === "insufficient"
      ? t("admin.revenue.forecast.warningInsufficient", { min: MIN_WEEKS, count: sampleWeeks })
      : status === "low_confidence"
        ? t("admin.revenue.forecast.warningLowConfidence", { count: sampleWeeks, reliable: RELIABLE_WEEKS })
        : null;

  return (
    <Card className="border-ink-200/80 bg-card flex h-full flex-col justify-between rounded-2xl border p-5 shadow-xs transition-shadow hover:shadow-md max-md:p-4 dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="text-ink-900 text-sm font-bold dark:text-slate-100">
            {t("admin.revenue.forecast.title")}
          </h3>
        </div>

        {/* Time Horizon Selector */}
        <Select value={String(timeHorizon)} onValueChange={(value) => setTimeHorizon(Number(value) as TimeHorizon)}>
          <SelectTrigger aria-label={t("admin.revenue.forecast.horizonAria")} size="sm" className="rounded-xl text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="3">{t("admin.revenue.forecast.months3")}</SelectItem>
            <SelectItem value="6">{t("admin.revenue.forecast.months6")}</SelectItem>
            <SelectItem value="12">{t("admin.revenue.forecast.months12")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isLoading && warning && (
        <div
          role="alert"
          className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Chart Area */}
      <div className="h-[210px] w-full">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="bg-ink-100 h-40 w-full animate-pulse rounded-lg dark:bg-slate-800" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-ink-400 flex h-full w-full items-center justify-center text-xs">
            {t("admin.revenue.forecast.empty")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -22, bottom: 0 }}
            >
              <defs>
                <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ink-200)" opacity={0.6} />
              <XAxis
                dataKey="monthLabel"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tick={{ fontSize: 10, fill: "var(--ink-400)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--ink-400)" }}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                cursor={{ stroke: "var(--ink-300)", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  const isF = !item?.isHistorical;
                  const val = (isF ? item?.forecastBase : item?.actual) ?? 0;
                  const pct = item?.percentageChangeVsCurrent ?? 0;

                  return (
                    <div className="border-ink-200 bg-card rounded-xl border p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-ink-400 text-xs font-semibold dark:text-slate-500">
                        {t("admin.revenue.forecast.weekOf", { label, kind: isF ? t("admin.revenue.forecast.kindForecast") : t("admin.revenue.forecast.kindActual") })}
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-ink-900 text-base font-bold dark:text-slate-100">
                          {formatVnd(val)}
                        </span>
                      </div>
                      {isF && (
                        <>
                          <p className="text-ink-500 mt-1 text-[11px] dark:text-slate-400">
                            {t("admin.revenue.forecast.confidenceRange", {
                              conservative: formatVnd(item?.conservative ?? 0),
                              optimistic: formatVnd(item?.optimistic ?? 0),
                            })}
                          </p>
                          <p className="text-ink-600 mt-0.5 text-[11px] font-semibold dark:text-slate-300">
                            {t("admin.revenue.forecast.vsLastCompletedWeek", { change: pct >= 0 ? `+${pct}%` : `${pct}%` })}
                          </p>
                        </>
                      )}
                    </div>
                  );
                }}
              />

              {/* 95% prediction interval */}
              <Area
                type="linear"
                dataKey="band"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.1}
                activeDot={false}
                isAnimationActive={false}
                name={t("admin.revenue.forecast.intervalName")}
              />

              {/* Actual Area: straight segments between weekly points, no smoothing */}
              <Area
                type="linear"
                dataKey="actual"
                fill="url(#actualAreaGrad)"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 1.5, fill: "#2563eb" }}
                name={t("admin.revenue.forecast.seriesActual")}
              />

              <Line
                type="linear"
                dataKey="forecastBase"
                stroke="#3b82f6"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                dot={false}
                name={t("admin.revenue.forecast.seriesForecastBase")}
              />
              <Line
                type="linear"
                dataKey="optimistic"
                stroke="#10b981"
                strokeWidth={1.2}
                strokeDasharray="4 4"
                dot={false}
                name={t("admin.revenue.forecast.seriesOptimistic")}
              />
              <Line
                type="linear"
                dataKey="conservative"
                stroke="#f43f5e"
                strokeWidth={1.2}
                strokeDasharray="4 4"
                dot={false}
                name={t("admin.revenue.forecast.seriesConservative")}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Model summary */}
      {!isLoading && showForecast && (
        <div className="text-ink-500 mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] dark:text-slate-400">
          <span>
            {t("admin.revenue.forecast.modelSummary", { count: sampleWeeks, rSquared: (data?.rSquared ?? 0).toFixed(2) })}
          </span>
          <span
            className={
              weeklyTrend >= 0
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : "font-semibold text-rose-600 dark:text-rose-400"
            }
          >
            {trendLabel}
          </span>
        </div>
      )}

      {/* Bottom Legend */}
      <div className="border-ink-100 text-ink-500 mt-2 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 border-t pt-2 text-[10px] font-medium dark:border-slate-800 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-blue-600" />
          <span>{t("admin.revenue.forecast.seriesActual")}</span>
        </div>
        {showForecast && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full border-t border-dashed border-blue-500" />
              <span>{t("admin.revenue.forecast.seriesForecastBase")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full border-t border-dashed border-emerald-500" />
              <span>{t("admin.revenue.forecast.seriesOptimistic")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full border-t border-dashed border-rose-500" />
              <span>{t("admin.revenue.forecast.seriesConservative")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-sm bg-blue-500/15" />
              <span>{t("admin.revenue.forecast.intervalName")}</span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
