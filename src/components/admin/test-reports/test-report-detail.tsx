"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { TestReportComparison } from "@/components/admin/test-reports/test-report-comparison";
import { TestReportFailureGroups } from "@/components/admin/test-reports/test-report-failure-groups";
import { TestReportFileAccordion } from "@/components/admin/test-reports/test-report-file-accordion";
import { TestReportFileFailures } from "@/components/admin/test-reports/test-report-file-failures";
import { TestReportRunTrend } from "@/components/admin/test-reports/test-report-run-trend";
import { TestReportSlowestSpecs } from "@/components/admin/test-reports/test-report-slowest-specs";
import { TestReportVerdict } from "@/components/admin/test-reports/test-report-verdict";
import { Button } from "@/components/ui/button";
import { useAdminTestReport } from "@/hooks/queries/use-admin-test-report";
import { useAdminTestReports } from "@/hooks/queries/use-admin-test-reports";

type TestReportDetailProps = {
  runId: string;
};

export const TestReportDetail = ({ runId }: TestReportDetailProps) => {
  const { data, isLoading, isError, refetch } = useAdminTestReport(runId);
  const { data: list } = useAdminTestReports({ pageSize: 20 });

  const previousRunId = useMemo(() => {
    const runs = list?.items ?? [];
    const index = runs.findIndex((run) => run.runId === runId);
    return index >= 0 ? runs[index + 1]?.runId : undefined;
  }, [list?.items, runId]);

  const { data: previous } = useAdminTestReport(previousRunId ?? "__none__", {
    enabled: Boolean(previousRunId),
  });

  if (isError) {
    return (
      <AdminShell pageTitle="Test report">
        <div className="rounded-lg border border-rose-200 bg-rose-50/50 px-5 py-14 text-center">
          <p className="text-sm font-semibold text-rose-800">
            This report could not be read
          </p>
          <p className="mt-1 text-xs text-rose-600">
            The backend that keeps the reports did not answer.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </div>
      </AdminShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AdminShell pageTitle="Test report">
        <div className="space-y-4">
          <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell pageTitle="Test report">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-500">
            <Link href="/admin/test-reports">
              <ArrowLeft className="size-4" />
              All test reports
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="size-8 p-0"
            aria-label="Refresh the report"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>

        <TestReportVerdict run={data.run} />

        <TestReportComparison
          current={data}
          previous={previousRunId ? previous : undefined}
        />

        <TestReportRunTrend runs={list?.items ?? []} currentRunId={runId} />

        <div className="grid gap-4 xl:grid-cols-2">
          <TestReportFailureGroups files={data.files} />
          <TestReportFileFailures files={data.files} />
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
              The slowest tests
            </h3>
            <p className="mt-0.5 text-[10px] text-slate-400">
              The tests that took the most time in this run.
            </p>
          </div>
          <TestReportSlowestSpecs files={data.files} limit={6} />
        </section>

        <TestReportFileAccordion files={data.files} />
      </div>
    </AdminShell>
  );
};
