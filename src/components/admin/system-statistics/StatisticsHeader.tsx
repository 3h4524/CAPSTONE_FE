"use client";

import React from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatDateLabel } from "./statistics-insights";

interface StatisticsHeaderProps {
  timeRange: string;
  onTimeRangeChange: (newRange: string) => void;
  onExport: () => void;
  isExporting: boolean;
  periodStart?: string;
  periodEnd?: string;
}

const TIME_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "180d", label: "Last 180 days" },
  { value: "year", label: "This year" },
];

export function StatisticsHeader({
  timeRange,
  onTimeRangeChange,
  onExport,
  isExporting,
  periodStart,
  periodEnd,
}: StatisticsHeaderProps) {
  return (
    <div className="mb-4.5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-ink-900 text-2xl font-bold tracking-tight max-md:text-xl sm:text-[26px]">
          System Statistics
        </h1>
        <p className="text-ink-500 mt-1 text-xs sm:text-[13px]">
          <span className="max-md:hidden">Generation throughput, pipeline conversion and job reliability across all sellers</span>
          {periodStart && periodEnd && (
            <>
              <span className="max-md:hidden">{" · "}</span>
              <span className="text-ink-600 font-medium">
                {formatDateLabel(periodStart)} – {formatDateLabel(periodEnd, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 max-md:flex-nowrap">
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 focus:ring-ink-400 h-8.5 min-w-[135px] cursor-pointer rounded-xl px-3.5 text-xs font-medium shadow-2xs focus:ring-1 max-md:min-w-0 max-md:flex-1">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="border-ink-200 bg-card rounded-xl shadow-md">
            {TIME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="cursor-pointer text-xs font-medium">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={onExport}
          disabled={isExporting}
          variant="outline"
          size="sm"
          className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 h-8.5 cursor-pointer gap-1.5 rounded-xl px-3.5 text-xs font-medium shadow-2xs max-md:flex-1"
        >
          {isExporting ? (
            <Loader2 className="text-ink-500 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="text-ink-600 h-3.5 w-3.5" />
          )}
          <span>Export CSV</span>
        </Button>
      </div>
    </div>
  );
}
