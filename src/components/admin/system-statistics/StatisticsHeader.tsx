"use client";

import React from "react";
import { Calendar, Download, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StatisticsHeaderProps {
  timeRange: string;
  onTimeRangeChange: (newRange: string) => void;
  onExport: () => void;
  isExporting: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function StatisticsHeader({
  timeRange,
  onTimeRangeChange,
  onExport,
  isExporting,
  onRefresh,
  isRefreshing = false,
}: StatisticsHeaderProps) {
  const timeOptions = [
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "Last 90 days", value: "90d" },
    { label: "This year", value: "year" },
  ];

  return (
    <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center dark:border-slate-800">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          System Statistics
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          System-wide performance telemetry, asset volume, and service reliability
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-slate-200/80 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${
                isRefreshing ? "animate-spin text-slate-700" : ""
              }`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        )}

        <div className="flex h-9 items-center rounded-lg border border-slate-200/80 bg-white px-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Calendar className="mr-2 h-3.5 w-3.5 text-slate-400" />
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value)}
            className="cursor-pointer bg-transparent text-xs font-medium text-slate-700 outline-none dark:text-slate-200"
            aria-label="Select time range"
          >
            {timeOptions.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="dark:bg-slate-900 text-xs"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={onExport}
          disabled={isExporting}
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-slate-200/80 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          ) : (
            <Download className="h-3.5 w-3.5 text-slate-500" />
          )}
          <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
        </Button>
      </div>
    </div>
  );
}
