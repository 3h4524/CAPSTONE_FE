"use client";

import React from "react";
import { Calendar, ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRangeDate } from "@/helpers/revenue-transactions";

export type ReportFormat = "csv" | "xlsx";

interface RevenueGrowthCardProps {
  onExport: (format: ReportFormat) => void;
  isExporting?: boolean;
  /** Rows matching the period and the table filters, i.e. the report's Transactions section. */
  transactionCount: number;
  startDate: string;
  endDate: string;
}

/** Side card next to Recent Transactions: exports the revenue report. */
export function RevenueGrowthCard({
  onExport,
  isExporting,
  transactionCount,
  startDate,
  endDate,
}: RevenueGrowthCardProps) {
  return (
    <Card className="flex flex-col gap-4 self-start rounded-2xl border border-orange-100 bg-linear-to-b from-orange-50/80 via-white to-white p-5 shadow-xs dark:border-orange-900/40 dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold tracking-wide text-orange-600 uppercase dark:text-orange-400">
            Export
          </span>
          <h3 className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">Export report</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Download the revenue report for the selected period.
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
          <Download className="size-5" />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <FileSpreadsheet className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg leading-tight font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {transactionCount.toLocaleString("en-US")}
            <span className="ml-1.5 text-[11px] font-normal text-slate-500">transactions</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
            <Calendar className="size-3 text-slate-400" />
            {formatRangeDate(startDate)} – {formatRangeDate(endDate)}
          </p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isExporting}>
          <Button className="h-10 w-full gap-2 rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-sm hover:bg-orange-600">
            <Download className="size-4" />
            {isExporting ? "Exporting..." : "Export Report"}
            {!isExporting && <ChevronDown className="size-4 opacity-80" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-slate-500">Choose a format</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onExport("xlsx")} className="cursor-pointer items-start gap-2.5 py-2">
            <FileSpreadsheet className="mt-0.5 size-4 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Excel (.xlsx)</p>
              <p className="text-[11px] text-slate-500">One sheet per section, formatted</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onExport("csv")} className="cursor-pointer items-start gap-2.5 py-2">
            <FileText className="mt-0.5 size-4 text-slate-500" />
            <div>
              <p className="text-sm font-medium">CSV (.csv)</p>
              <p className="text-[11px] text-slate-500">All sections in one plain-text file</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}
