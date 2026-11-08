"use client";

import React, { useMemo, useState } from "react";
import { BarChart3,ChevronDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { bridgeRows, bridgeSummary, MRR_MOVEMENT_COLORS as COLORS, signedVnd } from "@/helpers/revenue-mrr-movement";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { PlanAiReviewResponse } from "@/types/plan-ai-review";
import type { MrrMovementDto } from "@/types/revenue";
import { formatCompactVndAmount, formatVnd } from "@/utils/format-currency";

import { WhyCustomersLeave } from "./WhyCustomersLeave";

interface MrrMovementCardProps {
  data?: MrrMovementDto;
  isLoading: boolean;
  /** The selected period (YYYY-MM-DD), for the labels. */
  startDate: string;
  endDate: string;
  /** The latest AI review, for why the selected plan's customers leave; the detail is in Plan Insights. */
  aiReview?: PlanAiReviewResponse;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shortDate = (iso: string) => {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
};

export function MrrMovementCard({ data, isLoading, startDate, endDate, aiReview }: MrrMovementCardProps) {
  const isPhone = useIsPhone();
  // A phone shows the chart first and keeps the per-plan breakdown folded.
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const showsBreakdown = !isPhone || isBreakdownOpen;
  const [selected, setSelected] = useState<string | null>(null);

  const months = useMemo(
    () =>
      (data?.months ?? []).map((month) => ({
        label: MONTHS[Number(month.monthStart.slice(5, 7)) - 1],
        new: month.new,
        expansion: month.expansion,
        contraction: -month.contraction,
        churn: -month.churn,
        net: month.net,
      })),
    [data?.months]
  );

  if (isLoading || !data) {
    return (
      <Card className="h-[380px] animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-[280px] rounded-xl bg-slate-100 dark:bg-slate-800/60" />
      </Card>
    );
  }

  const bridges = data.period;
  const bridge = bridges.find((b) => b.planName === selected) ?? bridges[0];
  const rows = bridge ? bridgeRows(bridge) : [];
  const largest = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  const net = bridge ? bridge.end - bridge.start : 0;
  const lastMonth = data.months[data.months.length - 1];
  const chartEnd = lastMonth ? shortDate(endDate) : "";

  return (
    <Card className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md max-md:p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">MRR Movement</h3>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Where monthly recurring revenue came from and where it went
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {(["new", "expansion", "contraction", "churn"] as const).map((key) => (
            <span key={key} className="flex items-center gap-1.5 capitalize">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[key] }} />
              {key}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Six months of movement */}
        <div className="flex min-w-0 flex-3 flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            6 months ending {chartEnd}
          </span>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} stackOffset="sign" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/80" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(value: number) => formatCompactVndAmount(value)}
                />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload as (typeof months)[number];
                    return (
                      <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs shadow-xl dark:border-slate-800 dark:bg-slate-900">
                        <p className="mb-1 font-bold text-slate-900 dark:text-slate-100">{label}</p>
                        {(["new", "expansion", "contraction", "churn"] as const).map((key) => (
                          <p key={key} className="flex justify-between gap-4 text-slate-600 capitalize dark:text-slate-300">
                            <span>{key}</span>
                            <span className="tabular-nums">{signedVnd(point[key])}</span>
                          </p>
                        ))}
                        <p className="mt-1 flex justify-between gap-4 border-t border-slate-100 pt-1 font-bold dark:border-slate-800">
                          <span>Net</span>
                          <span className={`tabular-nums ${point.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {signedVnd(point.net)}
                          </span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="new" stackId="mrr" fill={COLORS.new} maxBarSize={44} />
                <Bar dataKey="expansion" stackId="mrr" fill={COLORS.expansion} maxBarSize={44} radius={[4, 4, 0, 0]} />
                <Bar dataKey="contraction" stackId="mrr" fill={COLORS.contraction} maxBarSize={44} />
                <Bar dataKey="churn" stackId="mrr" fill={COLORS.churn} maxBarSize={44} radius={[0, 0, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-6 gap-2 pl-[72px] text-center text-[11px] font-semibold tabular-nums">
            {months.map((month) => (
              <span key={month.label} className={month.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                {month.net >= 0 ? "+" : ""}
                {formatCompactVndAmount(month.net)}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Net change per month, built from paid invoices. Bars above the line add MRR, bars below remove it.
          </p>
        </div>

        {/* The selected period, per plan */}
        {bridge && showsBreakdown && (
          <div className="flex min-w-0 flex-2 flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {shortDate(startDate)} – {shortDate(endDate)} by plan
              </span>
              <div role="tablist" aria-label="MRR movement plan" className="flex flex-wrap gap-1 rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800">
                {bridges.map((b) => {
                  const isSelected = b.planName === bridge.planName;
                  return (
                    <button
                      key={b.planName ?? "all"}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelected(b.planName)}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      {b.planName ?? "All plans"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs tabular-nums">
              <BridgeLine label={`MRR on ${shortDate(previousDay(startDate))}`} value={formatVnd(bridge.start)} strong />
              {rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[104px_minmax(0,1fr)_128px] items-center gap-2 max-md:grid-cols-[84px_minmax(0,1fr)_auto]">
                  <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
                  <span className="h-3 overflow-hidden rounded bg-slate-200/70 dark:bg-slate-700/60">
                    <span
                      className="block h-3"
                      style={{ width: `${(Math.abs(row.value) / largest) * 100}%`, backgroundColor: row.color }}
                    />
                  </span>
                  <span className={`text-right font-medium ${row.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {signedVnd(row.value)}
                  </span>
                </div>
              ))}
              <BridgeLine label={`MRR on ${shortDate(endDate)}`} value={formatVnd(bridge.end)} strong />
              <BridgeLine
                label="Net change"
                value={`${signedVnd(net)}${bridge.start > 0 ? ` (${net >= 0 ? "+" : "−"}${Math.abs((net / bridge.start) * 100).toFixed(1)}%)` : ""}`}
                strong
                tone={net > 0 ? "good" : net < 0 ? "bad" : undefined}
              />
            </div>

            <p
              className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                net < 0
                  ? "bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                  : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {bridgeSummary(bridge)}
            </p>

          </div>
        )}
      </div>

      {/* Full width under both, so the chart and the bridge keep the same height. */}
      {bridge && showsBreakdown && <WhyCustomersLeave planName={bridge.planName} aiReview={aiReview} />}
      {bridge && isPhone && (
        <button
          type="button"
          aria-expanded={isBreakdownOpen}
          className="flex min-h-11 items-center justify-center gap-1 text-xs font-semibold text-slate-600"
          onClick={() => setIsBreakdownOpen((open) => !open)}
        >
          {isBreakdownOpen ? "Hide breakdown" : "Show breakdown"}
          <ChevronDown className={`size-3.5 transition-transform ${isBreakdownOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      )}
    </Card>
  );
}

function BridgeLine({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "good" | "bad" }) {
  const toneClass =
    tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-1.5 first:border-0 first:pt-0 dark:border-slate-700/60">
      <span className={`text-slate-600 dark:text-slate-300 ${strong ? "font-semibold" : ""}`}>{label}</span>
      <span className={`${strong ? "font-bold" : ""} ${toneClass}`}>{value}</span>
    </div>
  );
}

/** The day before a YYYY-MM-DD date: the start of a period is MRR at the end of that day. */
function previousDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
