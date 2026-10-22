"use client";

import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TestReportRun } from "@/types/admin-test-reports";

type TestReportRunTrendProps = {
  runs: TestReportRun[];
  currentRunId: string;
};

type Point = {
  label: string;
  passRate: number;
  failed: number;
  isCurrent: boolean;
};

export const TestReportRunTrend = ({ runs, currentRunId }: TestReportRunTrendProps) => {
  const points = useMemo(
    () =>
      [...runs]
        .sort((left, right) => left.startedAtUtc.localeCompare(right.startedAtUtc))
        .map((run) => {
          const tested = run.passedTests + run.failedTests + run.flakyTests;
          return {
            label: new Date(run.startedAtUtc).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            passRate: tested === 0 ? 100 : Math.round((run.passedTests / tested) * 100),
            failed: run.failedTests,
            isCurrent: run.runId === currentRunId,
          };
        }),
    [runs, currentRunId]
  );

  if (points.length < 2) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
        Pass rate over the runs
      </h3>
      <p className="mt-0.5 mb-3 text-[10px] text-slate-400">
        Every run kept on this machine, oldest first. The big dot is this run.
      </p>

      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip
              formatter={(value, name) =>
                name === "passRate" ? [`${value}%`, "pass rate"] : [`${value}`, "failed"]
              }
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="passRate"
              stroke="#0f172a"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props as unknown as {
                  cx: number;
                  cy: number;
                  payload: Point;
                };
                return (
                  <circle
                    key={`${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={payload.isCurrent ? 6 : 3}
                    fill={payload.isCurrent ? "#0f172a" : "#94a3b8"}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
