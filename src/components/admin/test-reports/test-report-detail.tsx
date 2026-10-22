"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { TestReportDetailHeader } from "@/components/admin/test-reports/test-report-detail-header";
import { TestReportFileAccordion } from "@/components/admin/test-reports/test-report-file-accordion";
import { TestReportOutcomeChart } from "@/components/admin/test-reports/test-report-outcome-chart";
import { TestReportSlowestSpecs } from "@/components/admin/test-reports/test-report-slowest-specs";
import { Button } from "@/components/ui/button";
import { useAdminTestReport } from "@/hooks/queries/use-admin-test-report";

type TestReportDetailProps = {
  runId: string;
};

type OutcomeFilter = "all" | "failed" | "flaky";

export const TestReportDetail = ({ runId }: TestReportDetailProps) => {
  const { data, isLoading, isError, refetch } = useAdminTestReport(runId);
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");

  const files = useMemo(() => {
    const all = data?.files ?? [];
    if (outcome === "all") return all;
    return all
      .map((file) => ({
        ...file,
        specs: file.specs.filter((spec) => spec.status === outcome),
      }))
      .filter((file) => file.specs.length > 0);
  }, [data?.files, outcome]);

  const totals = useMemo(
    () =>
      (data?.files ?? []).reduce(
        (sum, file) => ({
          passed: sum.passed + file.passed,
          failed: sum.failed + file.failed,
          flaky: sum.flaky + file.flaky,
          skipped: sum.skipped + file.skipped,
        }),
        { passed: 0, failed: 0, flaky: 0, skipped: 0 }
      ),
    [data?.files]
  );

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

  return (
    <AdminShell pageTitle="Test report">
      <div className="flex flex-col gap-5">
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

        {isLoading || !data ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : (
          <>
            <TestReportDetailHeader run={data.run} />

            <div className="grid gap-4 lg:grid-cols-12">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] lg:col-span-4">
                <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                  Outcome
                </h3>
                <p className="mt-0.5 mb-2 text-[10px] text-slate-400">
                  How every test of this run ended.
                </p>
                <TestReportOutcomeChart
                  passed={totals.passed}
                  failed={totals.failed}
                  flaky={totals.flaky}
                  skipped={totals.skipped}
                />
              </section>

              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.02)] lg:col-span-8">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                    Slowest tests
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    The tests that took the most time in this run.
                  </p>
                </div>
                <TestReportSlowestSpecs files={data.files} />
              </section>
            </div>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                    Every test
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Open a file to see its tests. A failing test shows what went wrong.
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-md border border-slate-200 p-0.5">
                  {(
                    [
                      { value: "all", label: "All" },
                      { value: "failed", label: "Failed" },
                      { value: "flaky", label: "Flaky" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setOutcome(option.value)}
                      className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        outcome === option.value
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <TestReportFileAccordion files={files} />
            </section>
          </>
        )}
      </div>
    </AdminShell>
  );
};
