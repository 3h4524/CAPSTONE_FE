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

  if (isLoading) {
    return (
      <div className="space-y-2 p-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="px-5 py-14 text-center">
        <p className="text-sm font-semibold text-slate-700">No test run yet</p>
        <p className="mt-1 text-xs text-slate-400">
          Press “Run tests” to run the suite on this machine. The report is kept here.
        </p>
      </div>
    );
  }

  return (
    <Table className="max-md:block">
      <TableHeader className="max-md:hidden">
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
      <TableBody className="max-md:block">
        {runs.map((run) => (
          <TableRow
            key={run.runId}
            className="cursor-pointer hover:bg-slate-50/70 max-md:relative max-md:grid max-md:grid-cols-4 max-md:gap-x-2 max-md:gap-y-1.5 max-md:p-4"
            onClick={() => router.push(`/admin/test-reports/${run.runId}`)}
          >
            <TableCell className="font-mono text-xs whitespace-nowrap text-slate-600 max-md:col-span-4 max-md:p-0 max-md:pr-10">
              <Link
                href={`/admin/test-reports/${run.runId}`}
                className="hover:text-slate-900 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {formatStartedAt(run.startedAtUtc)}
              </Link>
            </TableCell>
            <TableCell className="max-md:col-span-4 max-md:p-0">
              <TestReportStatusBadge status={run.status} />
            </TableCell>
            <TableCell className="max-w-[220px] truncate font-mono text-xs text-slate-500 max-md:col-span-4 max-md:max-w-none max-md:p-0">
              {run.branch ?? "—"}
              {run.commitSha ? ` @ ${run.commitSha}` : ""}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-emerald-600 max-md:p-0 max-md:text-left">
              <span className="block font-sans text-[10px] text-slate-500 md:hidden">Passed</span>
              {run.passedTests}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-rose-600 max-md:p-0 max-md:text-left">
              <span className="block font-sans text-[10px] text-slate-500 md:hidden">Failed</span>
              {run.failedTests}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-amber-600 max-md:p-0 max-md:text-left">
              <span className="block font-sans text-[10px] text-slate-500 md:hidden">Flaky</span>
              {run.flakyTests}
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-slate-400 max-md:p-0 max-md:text-left">
              <span className="block font-sans text-[10px] text-slate-500 md:hidden">Skipped</span>
              {run.skippedTests}
            </TableCell>
            <TableCell className="text-right font-mono text-xs whitespace-nowrap text-slate-500 max-md:col-span-4 max-md:p-0 max-md:text-left">
              <span className="font-sans text-slate-500 md:hidden">Took </span>
              <RunTook run={run} />
            </TableCell>
            <TableCell className="max-md:absolute max-md:top-2 max-md:right-2 max-md:p-0">
              <Link
                href={`/admin/test-reports/${run.runId}`}
                className="inline-flex size-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 max-md:size-10"
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
