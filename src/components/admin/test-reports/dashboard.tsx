"use client";

import { useMemo, useState } from "react";
import { PlayCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TestReportMetricCards } from "@/components/admin/test-reports/metric-cards";
import { TestReportRunDialog } from "@/components/admin/test-reports/run-dialog";
import { TestReportRunTable } from "@/components/admin/test-reports/run-table";
import { PageHeader } from "@/components/commons/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminTestReportRun } from "@/hooks/mutations/use-admin-test-report-run";
import { useAdminTestReports } from "@/hooks/queries/use-admin-test-reports";
import { useTestReportEvents } from "@/hooks/use-test-report-events";
import type { TestReportStatus } from "@/types/admin-test-reports";

const STATUS_FILTERS: ReadonlyArray<{
  value: "all" | TestReportStatus;
  labelKey: string;
}> = [
  { value: "all", labelKey: "admin.testReports.dashboard.filterAll" },
  { value: "failed", labelKey: "admin.testReports.dashboard.filterFailed" },
  { value: "error", labelKey: "admin.testReports.dashboard.filterError" },
  { value: "running", labelKey: "admin.testReports.dashboard.filterRunning" },
  { value: "passed", labelKey: "admin.testReports.dashboard.filterPassed" },
];

export const TestReportsDashboard = () => {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<"all" | TestReportStatus>("all");
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const filter = useMemo(() => (status === "all" ? {} : { status }), [status]);

  const { data, isLoading, isError, refetch } = useAdminTestReports({
    ...filter,
    pageSize: 50,
  });
  useTestReportEvents();
  const { mutate: startRun, isPending } = useAdminTestReportRun();

  const runs = useMemo(() => data?.items ?? [], [data?.items]);
  const totals = useMemo(
    () =>
      runs.reduce(
        (sum, run) => ({
          passed: sum.passed + run.passedTests,
          failed: sum.failed + run.failedTests,
          flaky: sum.flaky + run.flakyTests,
        }),
        { passed: 0, failed: 0, flaky: 0 }
      ),
    [runs]
  );
  const tested = totals.passed + totals.failed + totals.flaky;
  const passRate = tested === 0 ? 100 : Math.round((totals.passed / tested) * 100);

  return (
    <>
      <div className="flex flex-col gap-5">
        <PageHeader
          title={t("admin.testReports.dashboard.title")}
          description={t("admin.testReports.dashboard.description")}
          actions={
            <Button
              type="button"
              onClick={() => setIsRunDialogOpen(true)}
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <PlayCircle className="size-4" />
              )}
              {t("admin.testReports.dashboard.runTests")}
            </Button>
          }
        />

        <TestReportMetricCards
          totalRuns={data?.totalCount ?? 0}
          passRate={passRate}
          failingTests={totals.failed}
          flakyTests={totals.flaky}
          isLoading={isLoading}
        />

        <section className="border-ink-200 bg-card overflow-hidden rounded-lg border shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
          <div className="border-ink-100 flex flex-col justify-between gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-ink-800 text-xs font-bold tracking-wide uppercase">
                {t("admin.testReports.dashboard.runsHeading")}
              </h3>
              <p className="text-ink-500 mt-0.5 text-[10px]">
                {t("admin.testReports.dashboard.runsDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(STATUS_FILTERS.find((option) => option.value === value)?.value ?? "all")
                }
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="size-8 p-0"
                aria-label={t("admin.testReports.dashboard.refreshAriaLabel")}
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>

          {isError ? (
            <div className="px-5 py-14 text-center">
              <p className="text-ink-700 text-sm font-semibold">
                {t("admin.testReports.dashboard.loadErrorTitle")}
              </p>
              <p className="text-ink-500 mt-1 text-xs">
                {t("admin.testReports.dashboard.loadErrorDescription")}
              </p>
            </div>
          ) : (
            <TestReportRunTable runs={runs} isLoading={isLoading} />
          )}
        </section>
      </div>

      <TestReportRunDialog
        open={isRunDialogOpen}
        onOpenChange={setIsRunDialogOpen}
        isPending={isPending}
        onConfirm={() => startRun(undefined, { onSettled: () => setIsRunDialogOpen(false) })}
      />
    </>
  );
};
