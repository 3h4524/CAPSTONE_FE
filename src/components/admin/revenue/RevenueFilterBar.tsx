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
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;
  const firstDayOfMonthStr = `${y}-${m}-01`;
  const firstDayOfYearStr = `${y}-01-01`;

  const handleChange = (key: keyof RevenueFilterDto, value: string | number) => {
    const updated = { ...filter, [key]: value, page: 1 };
    if (key === "startDate" || key === "endDate") {
      let s = String(key === "startDate" ? value : updated.startDate);
      let e = String(key === "endDate" ? value : updated.endDate);

      // Prevent selecting dates in the future
      if (s > todayStr) s = todayStr;
      if (e > todayStr) e = todayStr;

      // Ensure start date is never after end date
      if (s > e) {
        if (key === "startDate") e = s;
        else s = e;
      }

      updated.startDate = s;
      updated.endDate = e;

      const diffDays =
        (new Date(e).getTime() - new Date(s).getTime()) / (1000 * 3600 * 24);

      if (diffDays > 730) {
        // Multi-year (> 2 years) -> Granularity: "Year" (2025, 2026, 2027)
        updated.granularity = "Year";
      } else if (diffDays > 31) {
        // Multi-month within 1-2 years -> Granularity: "Month"
        updated.granularity = "Month";
      } else {
        updated.granularity = "Day";
      }
    }
    onFilterChange(updated);
  };

  // Determine active preset based on current date range
  const isDaily = filter.startDate === todayStr && filter.endDate === todayStr;
  const isMonthly = filter.startDate === firstDayOfMonthStr && filter.endDate === todayStr;
  const isYearly =
    filter.startDate === firstDayOfYearStr &&
    filter.endDate === todayStr &&
    filter.granularity === "Month";
  const isAllTime =
    filter.granularity === "Year" ||
    (filter.startDate <= "2024-01-01" && filter.endDate === todayStr);

  const handlePresetSelect = (
    preset: "Daily" | "Monthly" | "Yearly" | "All-Time"
  ) => {
    if (preset === "Daily") {
      onFilterChange({
        ...filter,
        startDate: todayStr,
        endDate: todayStr,
        granularity: "Day",
        page: 1,
      });
    } else if (preset === "Monthly") {
      onFilterChange({
        ...filter,
        startDate: firstDayOfMonthStr,
        endDate: todayStr,
        granularity: "Day",
        page: 1,
      });
    } else if (preset === "Yearly") {
      onFilterChange({
        ...filter,
        startDate: firstDayOfYearStr,
        endDate: todayStr,
        granularity: "Month",
        page: 1,
      });
    } else {
      // All-Time: Multi-year breakdown (2024, 2025, 2026, 2027)
      onFilterChange({
        ...filter,
        startDate: "2024-01-01",
        endDate: todayStr,
        granularity: "Year",
        page: 1,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
          <Calendar className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            type="date"
            value={filter.startDate}
            max={filter.endDate && filter.endDate < todayStr ? filter.endDate : todayStr}
            onChange={(e) => handleChange("startDate", e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-slate-700 outline-none focus:ring-0 dark:text-slate-200 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
          <span className="text-xs text-slate-300 dark:text-slate-600">–</span>
          <input
            type="date"
            value={filter.endDate}
            min={filter.startDate}
            max={todayStr}
            onChange={(e) => handleChange("endDate", e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-slate-700 outline-none focus:ring-0 dark:text-slate-200 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden"
          />
        </div>

        {/* Period Preset Segmented Pill */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-50/80 p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="px-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            Period:
          </span>
          {[
            { key: "Daily", label: "Daily", active: isDaily },
            { key: "Monthly", label: "Monthly", active: isMonthly },
            { key: "Yearly", label: "Yearly", active: isYearly },
            { key: "All-Time", label: "All-Time", active: isAllTime },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                handlePresetSelect(
                  item.key as "Daily" | "Monthly" | "Yearly" | "All-Time"
                )
              }
              className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-150 ${item.active
                  ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
            >
              {item.label}
            </button>
          ))}
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
