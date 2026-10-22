import { AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";

import type { TestReportRun } from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

type TestReportVerdictProps = {
  run: TestReportRun;
};

export const TestReportVerdict = ({ run }: TestReportVerdictProps) => {
  const isGreen = run.failedTests === 0;
  const needsAttention = run.unexpectedFailedTests;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        isGreen
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-rose-200 bg-rose-50/60"
      )}
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full",
              isGreen ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"
            )}
          >
            {isGreen ? (
              <CheckCircle2 className="size-6" />
            ) : (
              <AlertTriangle className="size-6" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
              {isGreen ? (
                <>Every test passed</>
              ) : (
                <>
                  {needsAttention} of {run.failedTests} failed test
                  {run.failedTests === 1 ? "" : "s"} need a look
                </>
              )}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {run.totalTests} tests over {run.fileCount} spec files
              {run.flakyTests > 0 && ` · ${run.flakyTests} flaky`}
              {run.skippedTests > 0 && ` · ${run.skippedTests} skipped`}
              {` · ${Math.round(run.durationMs / 1000)}s`}
            </p>
          </div>
        </div>

        {!isGreen && run.knownIssueTests > 0 && (
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
