"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
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
      <section className="border-ink-200 bg-card rounded-xl border p-5">
        <h3 className="text-ink-800 text-xs font-bold tracking-wide uppercase">
          {t("admin.testReports.fileFailures.heading")}
        </h3>
        <p className="text-ink-400 mt-2 text-[11px]">
          {t("admin.testReports.fileFailures.empty")}
        </p>
      </section>
    );
  }

  return (
    <section className="border-ink-200 bg-card rounded-xl border p-5">
      <h3 className="text-ink-800 text-xs font-bold tracking-wide uppercase">
        {t("admin.testReports.fileFailures.heading")}
      </h3>
      <p className="text-ink-400 mt-0.5 mb-3 text-[10px]">
        {t("admin.testReports.fileFailures.description")}
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
              tick={{ fontSize: 10, fill: "var(--ink-500)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) =>
                name === "knownIssues"
                  ? [
                      t("admin.testReports.fileFailures.knownGapsValue", { value }),
                      t("admin.testReports.fileFailures.knownGapsName"),
                    ]
                  : [
                      t("admin.testReports.fileFailures.failedValue", { value }),
                      t("admin.testReports.fileFailures.failedName"),
                    ]
              }
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--ink-200)",
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
