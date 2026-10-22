"use client";

import React from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Outcome = {
  name: string;
  value: number;
  color: string;
};

type TestReportOutcomeChartProps = {
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
};

export const TestReportOutcomeChart = ({
  passed,
  failed,
  flaky,
  skipped,
}: TestReportOutcomeChartProps) => {
  const outcomes: Outcome[] = [
    { name: "Passed", value: passed, color: "#10b981" },
    { name: "Failed", value: failed, color: "#f43f5e" },
    { name: "Flaky", value: flaky, color: "#f59e0b" },
    { name: "Skipped", value: skipped, color: "#94a3b8" },
  ].filter((outcome) => outcome.value > 0);

  const total = outcomes.reduce((sum, outcome) => sum + outcome.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-slate-400">
        The run covered no test.
      </div>
    );
  }

  return (
    <div className="relative h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={outcomes}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            stroke="none"
          >
            {outcomes.map((outcome) => (
              <Cell key={outcome.name} fill={outcome.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value} tests`, name]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 11,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold text-slate-900">{total}</span>
        <span className="text-[10px] tracking-wide text-slate-400 uppercase">tests</span>
      </div>
    </div>
  );
};
