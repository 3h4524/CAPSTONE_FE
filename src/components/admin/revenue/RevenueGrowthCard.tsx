"use client";

import React from "react";
import { Calendar, CheckCircle2, ChevronDown, Download, FileSpreadsheet, FileText, TrendingUp } from "lucide-react";

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

const REPORT_CONTENTS = [
  "KPIs vs. the previous period",
  "Revenue by plan and trend",
  "Subscriptions, forecast and alerts",
  "Every transaction (table filters)",
];

/** Side card next to Recent Transactions: what the revenue report contains plus its export. */
export function RevenueGrowthCard({
  onExport,
  isExporting,
  transactionCount,
  startDate,
  endDate,
}: RevenueGrowthCardProps) {
  return (
    <Card className="flex h-full flex-col gap-5 rounded-2xl border border-orange-100 bg-linear-to-b from-orange-50/80 via-white to-white p-5 shadow-xs dark:border-orange-900/40 dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold tracking-wide text-orange-600 uppercase dark:text-orange-400">
            Insights
          </span>
          <h3 className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">Grow your revenue</h3>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
          <TrendingUp className="size-5" />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Download the full revenue report for the selected period to share or analyze offline.
      </p>

      {/* Export summary */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <FileSpreadsheet className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-lg leading-tight font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {transactionCount.toLocaleString("en-US")}
            </p>
            <p className="text-[11px] text-slate-500">transactions in the report</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800">
          <Calendar className="size-3.5 text-slate-400" />
          {formatRangeDate(startDate)} – {formatRangeDate(endDate)}
        </div>
      </div>

      <ul className="space-y-2">
        {REPORT_CONTENTS.map((item) => (
          <li key={item} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="size-3.5 shrink-0 text-orange-500" />
            {item}
          </li>
        ))}
      </ul>

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isExporting}>
          <Button className="mt-auto h-10 w-full gap-2 rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-sm hover:bg-orange-600">
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
