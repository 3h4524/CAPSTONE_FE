"use client";

import React from "react";
import { Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/commons/layout/page-header";
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
  { value: "7d", key: "last7Days" },
  { value: "30d", key: "last30Days" },
  { value: "90d", key: "last90Days" },
  { value: "180d", key: "last180Days" },
  { value: "year", key: "thisYear" },
] as const;

export function StatisticsHeader({
  timeRange,
  onTimeRangeChange,
  onExport,
  isExporting,
  periodStart,
  periodEnd,
}: StatisticsHeaderProps) {
  const { t } = useTranslation("common");

  return (
    <PageHeader
      className="mb-4.5"
      title={t("admin.statistics.header.title")}
      description={
        <>
          {t("admin.statistics.header.description")}
          {periodStart && periodEnd && (
            <>
              {" · "}
              <span className="text-ink-600 font-medium">
                {formatDateLabel(periodStart)} – {formatDateLabel(periodEnd, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </>
          )}
        </>
      }
      actions={
      <div className="flex flex-wrap items-center gap-2.5 max-md:flex-nowrap">
        <Select value={timeRange} onValueChange={onTimeRangeChange}>
          <SelectTrigger className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 focus:ring-ink-400 h-8.5 min-w-[135px] cursor-pointer rounded-xl px-3.5 text-xs font-medium shadow-2xs focus:ring-1 max-md:min-w-0 max-md:flex-1">
            <SelectValue placeholder={t("admin.statistics.header.selectPeriod")} />
          </SelectTrigger>
          <SelectContent className="border-ink-200 bg-card rounded-xl shadow-md">
            {TIME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="cursor-pointer text-xs font-medium">
                {t(`admin.statistics.header.timeRange.${opt.key}`)}
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
          <span>{t("admin.statistics.header.exportCsv")}</span>
        </Button>
      </div>
      }
    />
  );
}
