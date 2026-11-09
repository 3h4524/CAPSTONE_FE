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
    <Card className="via-card to-card flex flex-col gap-4 self-start rounded-2xl border border-orange-100 bg-linear-to-b from-orange-50/80 p-5 shadow-xs max-md:hidden dark:border-orange-900/40 dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold tracking-wide text-orange-600 uppercase dark:text-orange-400">
            Export
          </span>
          <h3 className="text-ink-900 mt-0.5 text-base font-bold dark:text-slate-100">Export report</h3>
          <p className="text-ink-500 mt-1 text-xs leading-relaxed dark:text-slate-400">
            Download the revenue report for the selected period.
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
          <Download className="size-5" />
        </div>
      </div>

      <div className="border-ink-200/80 bg-card flex items-center gap-3 rounded-xl border px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <FileSpreadsheet className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-ink-900 text-lg leading-tight font-bold tabular-nums dark:text-slate-100">
            {transactionCount.toLocaleString("en-US")}
            <span className="text-ink-500 ml-1.5 text-[11px] font-normal">transactions</span>
          </p>
          <p className="text-ink-500 mt-0.5 flex items-center gap-1 text-[11px]">
            <Calendar className="text-ink-400 size-3" />
            {formatRangeDate(startDate)} – {formatRangeDate(endDate)}
          </p>
        </div>
      </div>

      <RevenueExportMenu onExport={onExport} isExporting={isExporting} />
    </Card>
  );
}

/** Chooses the report's format. On a phone it is a small button beside the page title instead of a card. */
export function RevenueExportMenu({
  onExport,
  isExporting,
  compact = false,
}: {
  onExport: (format: ReportFormat) => void;
  isExporting?: boolean;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isExporting}>
        {compact ? (
          <Button variant="outline" size="page-action" className="shrink-0 gap-2" disabled={isExporting}>
            <Download className="size-4" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        ) : (
          <Button className="h-10 w-full gap-2 rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-sm hover:bg-orange-600">
            <Download className="size-4" />
            {isExporting ? "Exporting..." : "Export Report"}
            {!isExporting && <ChevronDown className="size-4 opacity-80" />}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-ink-500 text-xs">Choose a format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onExport("xlsx")} className="cursor-pointer items-start gap-2.5 py-2">
          <FileSpreadsheet className="mt-0.5 size-4 text-emerald-600" />
          <div>
            <p className="text-sm font-medium">Excel (.xlsx)</p>
            <p className="text-ink-500 text-[11px]">One sheet per section, formatted</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onExport("csv")} className="cursor-pointer items-start gap-2.5 py-2">
          <FileText className="text-ink-500 mt-0.5 size-4" />
          <div>
            <p className="text-sm font-medium">CSV (.csv)</p>
            <p className="text-ink-500 text-[11px]">All sections in one plain-text file</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
