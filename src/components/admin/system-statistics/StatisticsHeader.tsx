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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">
          System Statistics
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-[13px]">
          Generation throughput, pipeline conversion and job reliability across all sellers
          {periodStart && periodEnd && (
            <>
              {" · "}
              <span className="font-medium text-slate-600">
                {formatDateLabel(periodStart)} – {formatDateLabel(periodEnd, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="h-8.5 min-w-[135px] cursor-pointer rounded-xl border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 focus:ring-1 focus:ring-slate-400">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 bg-white shadow-md">
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
          className="h-8.5 cursor-pointer gap-1.5 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          ) : (
            <Download className="h-3.5 w-3.5 text-slate-600" />
          )}
          <span>Export CSV</span>
        </Button>
      </div>
    </div>
  );
}
