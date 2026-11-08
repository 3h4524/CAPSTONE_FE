"use client";

import { useMemo } from "react";
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
    <section className="rounded-xl border border-ink-200 bg-card p-5">
      <h3 className="text-xs font-bold tracking-wide text-ink-800 uppercase">
        Pass rate over the runs
      </h3>
      <p className="mt-0.5 mb-3 text-[10px] text-ink-400">
        Every run kept on this machine, oldest first. The big dot is this run.
      </p>

      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--ink-100)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "var(--ink-400)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "var(--ink-400)" }}
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
                border: "1px solid var(--ink-200)",
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="passRate"
              stroke="var(--ink-900)"
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
                    fill={payload.isCurrent ? "var(--ink-900)" : "var(--ink-400)"}
                    stroke="var(--card)"
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
