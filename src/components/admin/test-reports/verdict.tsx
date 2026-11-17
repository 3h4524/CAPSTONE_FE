"use client";

import { AlertTriangle, CheckCircle2, FlaskConical, Loader2, OctagonAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RunTook } from "@/components/admin/test-reports/run-took";
import type { TestReportRun } from "@/types/admin-test-reports";
import { cn } from "@/utils/cn";

type TestReportVerdictProps = {
  run: TestReportRun;
};

const VERDICT_STYLES = {
  running: {
    frame: "border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/10",
    bubble: "bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  passed: {
    frame: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10",
    bubble: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  failed: {
    frame: "border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10",
    bubble: "bg-rose-100 dark:bg-rose-500/15 text-rose-500",
  },
  error: {
    frame: "border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10",
    bubble: "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
} as const;

export const TestReportVerdict = ({ run }: TestReportVerdictProps) => {
  const { t } = useTranslation("common");
  const style = VERDICT_STYLES[run.status];
  const unexpectedFailedCount = run.unexpectedFailedTests;

  const title =
    run.status === "running"
      ? t("admin.testReports.verdict.runningTitle")
      : run.status === "error"
        ? t("admin.testReports.verdict.errorTitle")
        : run.failedTests > 0
          ? t("admin.testReports.verdict.failedTitle", {
              unexpected: unexpectedFailedCount,
              count: run.failedTests,
            })
          : t("admin.testReports.verdict.passedTitle");

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
            <h2 className="font-display text-ink-900 text-xl font-bold tracking-tight">
              {title}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">
              {run.status === "running" ? (
                <>
                  {t("admin.testReports.verdict.runningDescriptionBefore")} <RunTook run={run} />{" "}
                  {t("admin.testReports.verdict.runningDescriptionAfter")}
                </>
              ) : run.status === "error" ? (
                <>{t("admin.testReports.verdict.errorDescription")}</>
              ) : run.status === "failed" ? (
                <>{t("admin.testReports.verdict.failedDescription")}</>
              ) : (
                <>
                  {t("admin.testReports.verdict.passedDescription", {
                    count: run.totalTests,
                    fileCount: run.fileCount,
                  })}
                  {run.flakyTests > 0 && (
                    <>
                      {" · "}
                      {t("admin.testReports.verdict.flakySuffix", { count: run.flakyTests })}
                    </>
                  )}
                  {run.skippedTests > 0 && (
                    <>
                      {" · "}
                      {t("admin.testReports.verdict.skippedSuffix", { count: run.skippedTests })}
                    </>
                  )}
                  {` · ${t("admin.testReports.verdict.durationSuffix", {
                    value: Math.round(run.durationMs / 1000),
                  })}`}
                </>
              )}
            </p>
          </div>
        </div>

        {run.status === "failed" && run.knownIssueTests > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              <span className="font-bold">
                {t("admin.testReports.verdict.knownIssueLead", { count: run.knownIssueTests })}
              </span>{" "}
              {t("admin.testReports.verdict.knownIssueBefore")}
              <span className="font-mono">BUG B…</span>
              {t("admin.testReports.verdict.knownIssueAfter")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
