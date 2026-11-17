"use client";

import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");

  const outcomes: Outcome[] = [
    { name: t("admin.testReports.outcomeChart.passed"), value: passed, color: "#10b981" },
    { name: t("admin.testReports.outcomeChart.failed"), value: failed, color: "#f43f5e" },
    { name: t("admin.testReports.outcomeChart.flaky"), value: flaky, color: "#f59e0b" },
    { name: t("admin.testReports.outcomeChart.skipped"), value: skipped, color: "var(--ink-400)" },
  ].filter((outcome) => outcome.value > 0);

  const total = outcomes.reduce((sum, outcome) => sum + outcome.value, 0);

  if (total === 0) {
    return (
      <div className="text-ink-400 flex h-[220px] items-center justify-center text-xs">
        {t("admin.testReports.outcomeChart.empty")}
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
            formatter={(value, name) => [
              t("admin.testReports.outcomeChart.tooltipValue", { value }),
              name,
            ]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--ink-200)",
              fontSize: 11,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-ink-900 text-2xl font-bold">{total}</span>
        <span className="text-ink-400 text-[10px] tracking-wide uppercase">
          {t("admin.testReports.outcomeChart.tests")}
        </span>
      </div>
    </div>
  );
};
