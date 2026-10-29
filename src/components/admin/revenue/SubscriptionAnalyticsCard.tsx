"use client";

import React, { useState } from "react";
import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import {
  CHANGE_TONE_CLASS,
  type ChangePolarity,
  changeTone,
  formatChange,
} from "@/helpers/revenue-change";
import type { MetricDetail, SubscriptionAnalyticsDto } from "@/types/revenue";

interface SubscriptionAnalyticsCardProps {
  data?: SubscriptionAnalyticsDto;
  isLoading?: boolean;
}

type TabType = "Overview" | "New Signups" | "Renewals" | "Churn";
type SeriesKey = "newSubscriptions" | "renewals" | "cancellations";

const TABS: TabType[] = ["Overview", "New Signups", "Renewals", "Churn"];

// New + Renewals share the blue "growth" family; Cancellations is the only warm color.
const SERIES: Array<{ key: SeriesKey; name: string; color: string }> = [
  { key: "newSubscriptions", name: "New Subscriptions", color: "#2563eb" },
  { key: "renewals", name: "Renewals", color: "#60a5fa" },
  { key: "cancellations", name: "Cancellations", color: "#f43f5e" },
];

const FOCUS_BY_TAB: Record<TabType, SeriesKey | null> = {
  Overview: null,
  "New Signups": "newSubscriptions",
  Renewals: "renewals",
  Churn: "cancellations",
};

export function SubscriptionAnalyticsCard({
  data,
  isLoading,
}: SubscriptionAnalyticsCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("Overview");

  const points = data?.points ?? [];
  const focus = FOCUS_BY_TAB[activeTab];

  return (
    <Card className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Subscription Analytics
            </h3>
          </div>

          {/* Legend: the focused series stays solid, the rest fade with the chart */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-400">
            {SERIES.map((s) => (
              <div
                key={s.key}
                className={`flex items-center gap-1.5 transition-opacity ${
                  focus && focus !== s.key ? "opacity-40" : ""
                }`}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-1 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                activeTab === tab
                  ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 flex-col justify-between pt-1">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* One chart for every tab: areas over time, the tab only changes emphasis */}
          <div className="h-[210px] w-full lg:col-span-8">
            {isLoading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-40 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : points.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                No subscription data recorded in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={points}
                  margin={{ top: 10, right: 5, left: -22, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="dateLabel"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "3 3" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-md dark:border-slate-800 dark:bg-slate-900">
                          <p className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {label}
                          </p>
                          {payload.map((item) => (
                            <div key={String(item.dataKey)} className="flex items-center gap-2 text-xs">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-slate-500 dark:text-slate-400">{item.name}:</span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {SERIES.map((s) => {
                    const isFocused = focus === null || focus === s.key;
                    return (
                      <Area
                        key={s.key}
                        type="linear"
                        dataKey={s.key}
                        name={s.name}
                        // Overview stacks New + Renewals as one "growth" group; single-series tabs don't stack.
                        stackId={focus === null && s.key !== "cancellations" ? "growth" : undefined}
                        stroke={s.color}
                        strokeWidth={focus === s.key ? 2.4 : 1.6}
                        strokeOpacity={isFocused ? 1 : 0.25}
                        fill={s.color}
                        fillOpacity={isFocused ? (focus === s.key ? 0.22 : 0.12) : 0.03}
                        dot={false}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Right metrics column */}
          <div className="flex flex-col justify-between py-1 pl-2 lg:col-span-4">
            <MetricRow label="New Subscriptions" metric={data?.newSubscriptions} />
            <MetricRow label="Renewals" metric={data?.renewals} />
            <MetricRow label="Cancellations" metric={data?.cancellations} polarity="lower-is-better" />
            <MetricRow
              label="Churn Rate"
              metric={data?.churnRate}
              polarity="lower-is-better"
              // Average monthly churn (cancellations / customer-months at risk); undefined with nobody active.
              formatValue={(v) => (data?.hasChurnRate ? `${v}%` : "—")}
              changeUnit=" pp"
              hint={data?.hasChurnRate ? "average per month" : undefined}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetricRow({
  label,
  metric,
  polarity = "higher-is-better",
  formatValue = (v) => String(v),
  changeUnit = "%",
  hint,
}: {
  label: string;
  metric?: MetricDetail;
  polarity?: ChangePolarity;
  formatValue?: (value: number) => string;
  /** "%" for a relative change of a count, " pp" for the point change of a rate. */
  changeUnit?: "%" | " pp";
  hint?: string;
}) {
  const value = metric?.value ?? 0;
  const pct = metric?.percentageChange;
  const tone = changeTone(pct, polarity);
  // A large change against a small previous period is easier to read next to that period's value.
  const changeTitle = metric
    ? `vs. previous period: ${formatValue(metric.previousValue)}${changeUnit === " pp" ? " (percentage points)" : ""}`
    : "vs. previous period";

  return (
    <div>
      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{label}</span>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-base font-bold text-slate-900 dark:text-slate-100">{formatValue(value)}</span>
        <span
          title={changeTitle}
          className={`flex cursor-help items-center text-xs font-semibold ${CHANGE_TONE_CLASS[tone]}`}
        >
          {pct != null && pct > 0 && <ArrowUp className="size-3" />}
          {pct != null && pct < 0 && <ArrowDown className="size-3" />}
          {formatChange(pct, value, changeUnit)}
        </span>
      </div>
      {hint && <p className="text-[10px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}
