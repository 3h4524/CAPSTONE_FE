"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { RunTook } from "@/components/admin/test-reports/run-took";
import { TestReportStatusBadge } from "@/components/admin/test-reports/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { TestReportRun } from "@/types/admin-test-reports";

type TestReportRunTableProps = {
  runs: TestReportRun[];
  isLoading: boolean;
};

const formatStartedAt = (startedAtUtc: string) =>
  new Date(startedAtUtc).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const TestReportRunTable = ({ runs, isLoading }: TestReportRunTableProps) => {
  const router = useRouter();
  const isPhone = useIsPhone();

  if (isLoading) {
    return (
      <div className="space-y-2 p-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-ink-100 h-10 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="px-5 py-14 text-center">
        <p className="text-ink-700 text-sm font-semibold">No test run yet</p>
        <p className="text-ink-400 mt-1 text-xs">
          Press “Run tests” to run the suite on this machine. The report is kept here.
        </p>
      </div>
    );
  }

  if (isPhone) {
    return (
      <ul className="divide-y">
        {runs.map((run) => (
          <li key={run.runId}>
            <Link href={`/admin/test-reports/${run.runId}`} className="flex items-center gap-3 px-1 py-3" aria-label={`Open the report of ${run.runId}`}>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-ink-600 font-mono text-xs">{formatStartedAt(run.startedAtUtc)}</p>
                <TestReportStatusBadge status={run.status} />
                <p className="text-ink-500 truncate font-mono text-xs">
                  {run.branch ?? "—"}
                  {run.commitSha ? ` @ ${run.commitSha}` : ""}
                </p>
                <dl className="text-ink-500 grid grid-cols-4 gap-2 text-[10px]">
                  {[
                    ["Passed", run.passedTests, "text-emerald-600 dark:text-emerald-400"],
                    ["Failed", run.failedTests, "text-rose-600 dark:text-rose-400"],
                    ["Flaky", run.flakyTests, "text-amber-600 dark:text-amber-400"],
                    ["Skipped", run.skippedTests, "text-ink-400"],
                  ].map(([label, count, tone]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd className={`font-mono text-xs ${tone}`}>{count}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-ink-500 font-mono text-xs">
                  <RunTook run={run} />
                </p>
              </div>
              <ArrowRight className="text-ink-400 size-4 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-[10px] tracking-wider uppercase">Started</TableHead>
          <TableHead className="text-[10px] tracking-wider uppercase">State</TableHead>
          <TableHead className="text-[10px] tracking-wider uppercase">Branch</TableHead>
          <TableHead className="text-right text-[10px] tracking-wider uppercase">Passed</TableHead>
          <TableHead className="text-right text-[10px] tracking-wider uppercase">Failed</TableHead>
          <TableHead className="text-right text-[10px] tracking-wider uppercase">Flaky</TableHead>
          <TableHead className="text-right text-[10px] tracking-wider uppercase">Skipped</TableHead>
          <TableHead className="text-right text-[10px] tracking-wider uppercase">Took</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow
            key={run.runId}
            className="hover:bg-ink-50/70 cursor-pointer"
            onClick={() => router.push(`/admin/test-reports/${run.runId}`)}
          >
            <TableCell className="text-ink-600 font-mono text-xs whitespace-nowrap">
              <Link
                href={`/admin/test-reports/${run.runId}`}
                className="hover:text-ink-900 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {formatStartedAt(run.startedAtUtc)}
              </Link>
            </TableCell>
            <TableCell>
              <TestReportStatusBadge status={run.status} />
            </TableCell>
            <TableCell className="text-ink-500 max-w-[220px] truncate font-mono text-xs">
              {run.branch ?? "—"}
              {run.commitSha ? ` @ ${run.commitSha}` : ""}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
              {run.passedTests}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">
              {run.failedTests}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-amber-600 dark:text-amber-400">
              {run.flakyTests}
            </TableCell>
            <TableCell className="text-ink-400 text-right font-mono text-xs">
              {run.skippedTests}
            </TableCell>
            <TableCell className="text-ink-500 text-right font-mono text-xs whitespace-nowrap">
              <RunTook run={run} />
            </TableCell>
            <TableCell>
              <Link
                href={`/admin/test-reports/${run.runId}`}
                className="text-ink-400 hover:bg-ink-100 hover:text-ink-700 inline-flex size-7 items-center justify-center rounded transition-colors"
                aria-label={`Open the report of ${run.runId}`}
                onClick={(event) => event.stopPropagation()}
              >
                <ArrowRight className="size-4" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
