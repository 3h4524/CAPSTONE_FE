"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DECISION_CHART_COLORS, DECISIONS, formatNumber } from "@/components/admin/content-safety/shared";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ModerationDailyPoint, ModerationDecision } from "@/types/admin-moderation";

// Stacked from the baseline up: the bulk (allowed) at the bottom, what needs attention on top where it is easy to see.
const SERIES: { key: keyof ModerationDailyPoint; decision: ModerationDecision }[] = [
  { key: "allowed", decision: "allow" },
  { key: "unchecked", decision: "unchecked" },
  { key: "flagged", decision: "flagged" },
  { key: "blocked", decision: "block" },
];

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));

type TooltipEntry = { dataKey?: string | number; value?: number };

const ChartTooltip = ({ active, label, payload }: { active?: boolean; label?: string; payload?: TooltipEntry[] }) => {
  if (!active || !payload?.length || !label) return null;
  const values = Object.fromEntries(payload.map((entry) => [String(entry.dataKey), Number(entry.value ?? 0)]));
  const total = SERIES.reduce((sum, series) => sum + (values[series.key] ?? 0), 0);
  return (
    <div className="border-ink-200 bg-card text-ink-800 dark:text-ink-100 min-w-44 rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="text-ink-900 dark:text-ink-50 mb-1.5 font-semibold">{shortDate(label)}</p>
      <ul className="space-y-1">
        {[...SERIES].reverse().map((series) => (
          <li key={series.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: DECISION_CHART_COLORS[series.decision] }}
                aria-hidden="true"
              />
              {DECISIONS[series.decision].label}
            </span>
            <span className="font-medium tabular-nums">{formatNumber(values[series.key] ?? 0)}</span>
          </li>
        ))}
      </ul>
      <p className="border-ink-100 mt-1.5 flex justify-between border-t pt-1.5 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatNumber(total)}</span>
      </p>
    </div>
  );
};

/** Checks per day by decision, with a legend above it and a table view for the same numbers. */
export const DecisionsChart = ({ daily }: { daily: ModerationDailyPoint[] }) => {
  const [showTable, setShowTable] = useState(false);
  const hasData = daily.some((day) => day.allowed + day.flagged + day.blocked + day.unchecked > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
          {[...SERIES].reverse().map((series) => (
            <li key={series.key} className="text-ink-600 flex items-center gap-1.5 text-xs">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: DECISION_CHART_COLORS[series.decision] }}
                aria-hidden="true"
              />
              {DECISIONS[series.decision].label}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-ink-600 h-8 hover:translate-y-0"
          aria-pressed={showTable}
          onClick={() => setShowTable((value) => !value)}
        >
          {showTable ? "Show chart" : "Show as table"}
        </Button>
      </div>

      {showTable ? (
        <div className="border-ink-200 max-h-72 overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                {[...SERIES].reverse().map((series) => (
                  <TableHead key={series.key} className="text-right">
                    {DECISIONS[series.decision].label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...daily].reverse().map((day) => (
                <TableRow key={day.date}>
                  <TableCell>{shortDate(day.date)}</TableCell>
                  {[...SERIES].reverse().map((series) => (
                    <TableCell key={series.key} className="text-right tabular-nums">
                      {formatNumber(Number(day[series.key]))}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="relative h-64 w-full">
          {!hasData && (
            <p className="text-ink-500 absolute inset-0 z-10 grid place-items-center text-sm">
              No checks in this period yet.
            </p>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -12 }} barCategoryGap="18%">
              <CartesianGrid vertical={false} stroke="var(--ink-200)" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tick={{ fontSize: 11, fill: "var(--ink-500)" }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fontSize: 11, fill: "var(--ink-500)" }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--ink-100)", opacity: 0.6 }} />
              {SERIES.map((series, index) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  stackId="decisions"
                  fill={DECISION_CHART_COLORS[series.decision]}
                  // A thin ring in the card's color separates stacked segments.
                  stroke="var(--card)"
                  strokeWidth={1}
                  radius={index === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                  isAnimationActive={false}
                  name={DECISIONS[series.decision].label}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
