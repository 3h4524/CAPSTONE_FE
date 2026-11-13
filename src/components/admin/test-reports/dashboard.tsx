"use client";

import { useMemo, useState } from "react";
import { PlayCircle, RefreshCw } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { TestReportMetricCards } from "@/components/admin/test-reports/metric-cards";
import { TestReportRunDialog } from "@/components/admin/test-reports/run-dialog";
import { TestReportRunTable } from "@/components/admin/test-reports/run-table";
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
  label: string;
}> = [
  { value: "all", label: "Every state" },
  { value: "failed", label: "Failed" },
  { value: "error", label: "Broken" },
  { value: "running", label: "Running" },
  { value: "passed", label: "Passed" },
];

export const TestReportsDashboard = () => {
  const [status, setStatus] = useState<"all" | TestReportStatus>("all");
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const filter = useMemo(
    () => (status === "all" ? {} : { status }),
    [status]
  );

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
    <AdminShell>
      <div className="flex flex-col gap-5">
        <section className="border-ink-200 bg-card rounded-lg border p-5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-ink-900 text-sm font-bold">End-to-end test reports</h2>
              <p className="text-ink-500 mt-1 max-w-2xl text-[11px] leading-relaxed">
                Every run of the Playwright suite is kept on the machine that made it. Press
                “Run tests” to run the suite here; the running row counts up here and flips by
                itself the moment the suite lands.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsRunDialogOpen(true)}
              disabled={isPending}
              className="gap-2 self-start"
            >
              {isPending ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <PlayCircle className="size-4" />
              )}
              Run tests
            </Button>
          </div>
        </section>

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
                Test runs
              </h3>
              <p className="text-ink-400 mt-0.5 text-[10px]">
                Newest first. Open a run to see every test it covered.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(
                    STATUS_FILTERS.find((option) => option.value === value)?.value ?? "all"
                  )
                }
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
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
                aria-label="Refresh the list of runs"
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>

          {isError ? (
            <div className="px-5 py-14 text-center">
              <p className="text-ink-700 text-sm font-semibold">
                The list of runs could not be read
              </p>
              <p className="text-ink-400 mt-1 text-xs">
                The backend that keeps the reports did not answer.
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
        onConfirm={() =>
          startRun(undefined, { onSettled: () => setIsRunDialogOpen(false) })
        }
      />
    </AdminShell>
  );
};
