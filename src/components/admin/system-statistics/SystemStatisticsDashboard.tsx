"use client";

import React, { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { exportSystemStatisticsCsv } from "@/api/system-statistics";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { useSystemStatisticsOverview } from "@/hooks/queries/use-system-statistics";

import { DailyJobsBarChart } from "./DailyJobsBarChart";
import { IntegrationHealthCards } from "./IntegrationHealthCards";
import { PipelineStageBreakdown } from "./PipelineStageBreakdown";
import { RecentErrorsTable } from "./RecentErrorsTable";
import { StatisticsHeader } from "./StatisticsHeader";
import { StatisticsMetricCards } from "./StatisticsMetricCards";

export function SystemStatisticsDashboard() {
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const { data, isLoading, isError, refetch, isFetching } =
    useSystemStatisticsOverview({
      timeRange,
    });

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
    <AdminShell pageTitle="System Statistics">
      <div className="flex flex-col">
        <StatisticsHeader
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onExport={handleExportCSV}
          isExporting={isExporting}
        />

        {isError ? (
          <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-rose-100 bg-rose-50/50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
            <AlertCircle className="mb-3 h-10 w-10 text-rose-500" />
            <h3 className="text-base font-semibold text-rose-900 dark:text-rose-200">
              Failed to load system statistics
            </h3>
            <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
              An error occurred while communicating with the analytics server. Please try again.
            </p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="mt-4 gap-2 border-rose-200 bg-white hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4 text-rose-500" />
              <span>Retry</span>
            </Button>
          </div>
        ) : (
          <>
            {/* Top 4 Summary Metric Cards */}
            <StatisticsMetricCards
              metrics={data?.metrics}
              isLoading={isLoading}
            />

            {/* Middle Section: Daily Jobs Chart & Pipeline Breakdown */}
            <div className="mb-6 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <DailyJobsBarChart
                  dailyJobs={data?.dailyJobs}
                  isLoading={isLoading}
                />
              </div>
              <div className="lg:col-span-4">
                <PipelineStageBreakdown
                  pipelineStages={data?.pipelineStages}
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* Integration Status Section */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                    Integration Health & Service Gateways
                  </h2>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    Third-party marketplace and channel sync reliability
                  </p>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Real-time telemetry
                </span>
              </div>
              <IntegrationHealthCards
                integrationStatus={data?.integrationStatus}
                isLoading={isLoading}
              />
            </div>

            {/* Bottom Section: Recent Operational Errors */}
            <RecentErrorsTable
              recentErrors={data?.recentErrors}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </AdminShell>
  );
}
