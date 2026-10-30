"use client";

import { useMemo } from "react";

import { RevenueTrendCard } from "@/components/admin/revenue/RevenueTrendCard";
import { dashboardTrendFilter } from "@/helpers/revenue-trend";
import { useRevenueCharts } from "@/hooks/queries/use-revenue";

type AdminRevenueTrendProps = {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
};

const RANGES = [
  { key: "Day", label: "7 days" },
  { key: "Month", label: "6 months" },
  { key: "Year", label: "5 years" },
] as const;

/** The Revenue page's trend card on the Dashboard, driven by the Dashboard's own range picker. */
const AdminRevenueTrend = ({ timeRange, onTimeRangeChange }: AdminRevenueTrendProps) => {
  const filter = useMemo(() => dashboardTrendFilter(timeRange), [timeRange]);
  const { data, isLoading } = useRevenueCharts(filter);

  return (
    <RevenueTrendCard
      trend={data?.trend}
      isLoading={isLoading}
      filter={filter}
      actions={
        <div role="tablist" aria-label="Revenue trend range" className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-800">
          {RANGES.map((range) => (
            <button
              key={range.key}
              type="button"
              role="tab"
              aria-selected={timeRange === range.key}
              onClick={() => onTimeRangeChange(range.key)}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                timeRange === range.key
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      }
    />
  );
};

export { AdminRevenueTrend };
