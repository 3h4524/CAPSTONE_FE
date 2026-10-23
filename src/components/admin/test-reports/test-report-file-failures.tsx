"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TestReportFile } from "@/types/admin-test-reports";

type TestReportFileFailuresProps = {
  files: TestReportFile[];
};

export const TestReportFileFailures = ({ files }: TestReportFileFailuresProps) => {
  const rows = useMemo(
    () =>
      files
        .map((file) => ({
          name: file.file.replace(/^e2e\//, ""),
          failures: file.failed,
          knownIssues: file.specs.filter(
            (spec) => spec.status === "failed" && spec.isKnownIssue
          ).length,
        }))
        .filter((row) => row.failures > 0)
        .sort((left, right) => right.failures - left.failures),
    [files]
  );

  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
          Which files are red
        </h3>
        <p className="mt-2 text-[11px] text-slate-400">No file has a failed test.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
        Which files are red
      </h3>
      <p className="mt-0.5 mb-3 text-[10px] text-slate-400">
        How many tests each file lost. The pale part is the known gaps.
      </p>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
          >
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) =>
                name === "knownIssues" ? [`${value} known gaps`, "known gaps"] : [`${value} tests`, "failed"]
              }
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 11,
              }}
            />
            <Bar dataKey="failures" stackId="a" radius={[0, 4, 4, 0]}>
              {rows.map((row) => (
                <Cell key={row.name} fill="#f43f5e" />
              ))}
            </Bar>
            <Bar dataKey="knownIssues" stackId="a" fill="#fcd34d" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
