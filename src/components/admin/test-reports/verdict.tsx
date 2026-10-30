"use client";

import { AlertTriangle, CheckCircle2, FlaskConical, Loader2, OctagonAlert } from "lucide-react";

import { RunTook } from "@/components/admin/test-reports/run-took";
import type { TestReportRun } from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

type TestReportVerdictProps = {
  run: TestReportRun;
};

const VERDICT_STYLES = {
  running: {
    frame: "border-sky-200 bg-sky-50/60",
    bubble: "bg-sky-100 text-sky-600",
  },
  passed: {
    frame: "border-emerald-200 bg-emerald-50/60",
    bubble: "bg-emerald-100 text-emerald-600",
  },
  failed: {
    frame: "border-rose-200 bg-rose-50/60",
    bubble: "bg-rose-100 text-rose-500",
  },
  error: {
    frame: "border-amber-200 bg-amber-50/60",
    bubble: "bg-amber-100 text-amber-600",
  },
} as const;

export const TestReportVerdict = ({ run }: TestReportVerdictProps) => {
  const style = VERDICT_STYLES[run.status];
  const unexpectedFailedCount = run.unexpectedFailedTests;

  const title =
    run.status === "running" ? (
      "The suite is running"
    ) : run.status === "error" ? (
      "The run broke before it could report"
    ) : run.failedTests > 0 ? (
      <>
        {unexpectedFailedCount} of {run.failedTests} failed test
        {run.failedTests === 1 ? "" : "s"} need a look
      </>
    ) : (
      <>Every test passed</>
    );

  return (
    <section className={cn("overflow-hidden rounded-xl border", style.frame)}>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full",
              style.bubble
            )}
          >
            {run.status === "running" && (
              <Loader2 className="size-6 animate-spin" />
            )}
            {run.status === "passed" && <CheckCircle2 className="size-6" />}
            {run.status === "failed" && <AlertTriangle className="size-6" />}
            {run.status === "error" && <OctagonAlert className="size-6" />}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {run.status === "running" ? (
                <>
                  The Playwright suite is going on this machine — took{" "}
                  <RunTook run={run} /> so far. This page follows the live state and
                  flips as soon as the run lands.
                </>
              ) : run.status === "error" ? (
                <>
                  The command behind this run failed without a report — its log tail is pinned at
                  the top of this page.
                </>
              ) : run.status === "failed" ? (
                <>
                  The report below lists every test that went red, the file it lives in and the
                  error the runner captured.
                </>
              ) : (
                <>
                  {run.totalTests} tests over {run.fileCount} spec files
                  {run.flakyTests > 0 && ` · ${run.flakyTests} flaky`}
                  {run.skippedTests > 0 && ` · ${run.skippedTests} skipped`}
                  {` · ${Math.round(run.durationMs / 1000)}s`}
                </>
              )}
            </p>
          </div>
        </div>

        {run.status === "failed" && run.knownIssueTests > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-3">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-[11px] leading-relaxed text-amber-800">
              <span className="font-bold">{run.knownIssueTests} failures</span> are the tests
              that pin a known gap (<span className="font-mono">BUG B…</span>). They fail while
              the gap is there and go red again once the gap is fixed — the fix is to drop those
              specs, not to chase them.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
