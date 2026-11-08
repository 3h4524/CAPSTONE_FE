"use client";

import { GitBranch, Hash, User } from "lucide-react";

import { RunTook } from "@/components/admin/test-reports/run-took";
import { TestReportStatusBadge } from "@/components/admin/test-reports/status-badge";
import type { TestReportRun } from "@/types/admin-test-reports";

type TestReportDetailHeaderProps = {
  run: TestReportRun;
};

export const TestReportDetailHeader = ({ run }: TestReportDetailHeaderProps) => (
  <section className="rounded-lg border border-ink-200 bg-card p-5 shadow-[0_2px_8px_rgba(15,23,42,0.02)] sm:p-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink-900">
            {run.runId}
          </h2>
          <TestReportStatusBadge status={run.status} />
        </div>
        <p className="mt-1 text-[11px] text-ink-500">
          Started{" "}
          {new Date(run.startedAtUtc).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {run.finishedAtUtc
            ? ` · ended ${new Date(run.finishedAtUtc).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}`
            : " · still going"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-500">
        {run.branch && (
          <span className="flex items-center gap-1.5">
            <GitBranch className="size-3.5 text-ink-400" />
            <span className="font-mono">{run.branch}</span>
          </span>
        )}
        {run.commitSha && (
          <span className="flex items-center gap-1.5">
            <Hash className="size-3.5 text-ink-400" />
            <span className="font-mono">{run.commitSha}</span>
          </span>
        )}
        {run.triggeredBy && (
          <span className="flex items-center gap-1.5">
            <User className="size-3.5 text-ink-400" />
            {run.triggeredBy}
          </span>
        )}
        <span className="font-mono">
          took <RunTook run={run} />
        </span>
      </div>
    </div>

    {run.failureSummary && (
      <pre className="mt-4 max-h-56 overflow-auto rounded border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-rose-700 dark:text-rose-300">
        {run.failureSummary}
      </pre>
    )}
  </section>
);
