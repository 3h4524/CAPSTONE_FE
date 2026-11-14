"use client";

import React, { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { exportSystemStatisticsCsv } from "@/api/system-statistics";
import { Button } from "@/components/ui/button";
import { useSystemStatisticsOverview } from "@/hooks/queries/use-system-statistics";

import { DailyJobsBarChart } from "./DailyJobsBarChart";
import { IntegrationHealthCards } from "./IntegrationHealthCards";
import { PipelineStageBreakdown } from "./PipelineStageBreakdown";
import { RecentErrorsTable } from "./RecentErrorsTable";
import { StatisticsHeader } from "./StatisticsHeader";
import { sectionId, StatisticsInsightsPanel } from "./StatisticsInsightsPanel";
import { StatisticsMetricCards } from "./StatisticsMetricCards";

const COMPARISON_PERIODS: Record<string, string> = {
  "7d": "week",
  "30d": "month",
  "90d": "quarter",
  "180d": "6 months",
  year: "year",
};

export function SystemStatisticsDashboard() {
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const { data, isLoading, isError, refetch } =
    useSystemStatisticsOverview({
      timeRange,
    });

  const comparisonLabel = `vs previous ${COMPARISON_PERIODS[timeRange] ?? "period"}`;

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const blob = await exportSystemStatisticsCsv({ timeRange });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute(
        "download",
        `system_statistics_${timeRange}_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("System statistics exported successfully!");
    } catch {
      toast.error("Failed to export statistics. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col pb-8">
      {/* Top Header: Title, Subtitle, Time Filter, Export CSV */}
      <StatisticsHeader
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onExport={handleExportCSV}
        isExporting={isExporting}
        periodStart={data?.periodStart}
        periodEnd={data?.periodEnd}
      />

      {isError ? (
        <div className="bg-card my-8 flex flex-col items-center justify-center rounded-2xl border border-rose-200 p-8 text-center shadow-2xs dark:border-rose-500/30">
          <AlertCircle className="mb-3 h-10 w-10 text-rose-500" />
          <h3 className="text-base font-semibold text-rose-900 dark:text-rose-300">
            Failed to load system statistics
          </h3>
          <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
            An error occurred while communicating with the analytics server. Please try again.
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="bg-card mt-4 cursor-pointer gap-2 border-rose-200 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
          >
            <RefreshCw className="h-4 w-4 text-rose-500" />
            <span>Retry</span>
          </Button>
        </div>
      ) : (
        <>
          {/* 1. Four Headline Metric Cards (Using Admin Dashboard KPI Card style) */}
          <StatisticsMetricCards
            metrics={data?.metrics}
            isLoading={isLoading}
            comparisonLabel={comparisonLabel}
            dailyJobs={data?.dailyJobs}
          />

          {/* The rows open up on a phone, so System health can follow the headline figures. */}
          {/* 2. Middle Row: Daily batch jobs (left 7 cols) & Pipeline conversion (right 5 cols) */}
          <div className="mb-4.5 grid grid-cols-1 items-stretch gap-4.5 max-md:contents lg:grid-cols-12">
            <div id={sectionId("volume")} className="scroll-mt-24 max-md:order-2 max-md:mb-3.5 lg:col-span-7">
              <DailyJobsBarChart
                dailyJobs={data?.dailyJobs}
                isLoading={isLoading}
                periodEnd={data?.periodEnd}
              />
            </div>
            <div id={sectionId("pipeline")} className="scroll-mt-24 max-md:order-2 max-md:mb-3.5 lg:col-span-5">
              <PipelineStageBreakdown
                pipelineStages={data?.pipelineStages}
                integrationStatus={data?.integrationStatus}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* 3. Bottom Row: System health (left 7 cols) & Integrations (right 5 cols) */}
          <div className="mb-4.5 grid grid-cols-1 items-stretch gap-4.5 max-md:contents lg:grid-cols-12">
            <div className="max-md:order-1 max-md:mb-3.5 lg:col-span-7">
              <StatisticsInsightsPanel data={data} isLoading={isLoading} />
            </div>
            <div id={sectionId("integrations")} className="scroll-mt-24 max-md:order-2 max-md:mb-3.5 lg:col-span-5">
              <IntegrationHealthCards
                integrationStatus={data?.integrationStatus}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* 4. Full-width Section: Recent Operational Errors */}
          <div id={sectionId("errors")} className="scroll-mt-24 max-md:order-2">
            <RecentErrorsTable
              recentErrors={data?.recentErrors}
              isLoading={isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
