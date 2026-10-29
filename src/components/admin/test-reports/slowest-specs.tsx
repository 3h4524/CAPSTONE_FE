"use client";

import { useMemo } from "react";
import { Timer } from "lucide-react";

import { TestReportStatusBadge } from "@/components/admin/test-reports/status-badge";
import type { TestReportFile } from "@/types/admin-test-reports";

type TestReportSlowestSpecsProps = {
  files: TestReportFile[];
  limit?: number;
};

export const TestReportSlowestSpecs = ({
  files,
  limit = 10,
}: TestReportSlowestSpecsProps) => {
  const slowest = useMemo(
    () =>
      files
        .flatMap((file) =>
          file.specs.map((spec) => ({
            title: spec.title,
            file: file.file,
            status: spec.status,
            durationMs: spec.durationMs,
          }))
        )
        .sort((left, right) => right.durationMs - left.durationMs)
        .slice(0, limit),
    [files, limit]
  );

  if (slowest.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-xs text-slate-400">
        The run covered no test.
      </p>
    );
  }

  const slowestTime = slowest[0]?.durationMs ?? 1;

  return (
    <ul className="divide-y divide-slate-100">
      {slowest.map((spec) => (
        <li key={`${spec.file}:${spec.title}`} className="px-5 py-3">
          <div className="flex items-center gap-3">
            <TestReportStatusBadge status={spec.status} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
              {spec.title}
            </span>
            <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-slate-500">
              <Timer className="size-3" />
              {spec.durationMs < 1000
                ? `${spec.durationMs} ms`
                : `${(spec.durationMs / 1000).toFixed(1)} s`}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-400"
                style={{ width: `${Math.max(4, (spec.durationMs / slowestTime) * 100)}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-[10px] text-slate-400">
              {spec.file}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};
