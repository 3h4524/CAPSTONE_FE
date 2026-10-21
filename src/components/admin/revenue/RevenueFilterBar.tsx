"use client";

import React from "react";
import { Calendar, ChevronDown } from "lucide-react";

import type { RevenueFilterDto } from "@/types/revenue";

interface RevenueFilterBarProps {
  filter: RevenueFilterDto;
  onFilterChange: (newFilter: RevenueFilterDto) => void;
  currency: "VND" | "USD";
  onCurrencyChange: (currency: "VND" | "USD") => void;
}

export function RevenueFilterBar({
  filter,
  onFilterChange,
  currency,
  onCurrencyChange,
}: RevenueFilterBarProps) {
  const handleChange = (key: keyof RevenueFilterDto, value: string | number) => {
    onFilterChange({ ...filter, [key]: value, page: 1 });
  };

  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
          Revenue Intelligence
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Track revenue, subscriptions, and financial performance with real-time insights.
        </p>
      </div>

      {/* Right Controls Bar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Date Range Picker Pill */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="date"
            value={filter.startDate}
            onChange={(e) => handleChange("startDate", e.target.value)}
            className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-slate-700 outline-none focus:ring-0 dark:text-slate-200"
          />
          <span className="text-xs text-slate-300 dark:text-slate-600">–</span>
          <input
            type="date"
            value={filter.endDate}
            onChange={(e) => handleChange("endDate", e.target.value)}
            className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-slate-700 outline-none focus:ring-0 dark:text-slate-200"
          />
        </div>

        {/* Group by: Segmented Pill */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-50/80 p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            Group by:
          </span>
          {(["Day", "Month", "Year"] as const).map((granularity) => {
            const isSelected = filter.granularity === granularity;
            const label =
              granularity === "Day"
                ? "Daily"
                : granularity === "Month"
                  ? "Monthly"
                  : "Yearly";

            return (
              <button
                key={granularity}
                type="button"
                onClick={() => handleChange("granularity", granularity)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Currency Switcher Dropdown */}
        <div className="relative">
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value as "VND" | "USD")}
            className="h-9 cursor-pointer appearance-none rounded-xl border border-slate-200/90 bg-white pr-8 pl-3 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:border-slate-300 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="VND">VND</option>
            <option value="USD">USD</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
