"use client";

import React, { useMemo, useState } from "react";
import { HelpCircle, Package, Star } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";

import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPlanColor, LOW_RETENTION_PERCENT, pickPlanLeaders } from "@/helpers/revenue-by-plan";
import { CHANGE_TONE_CLASS, changeTone, formatChange } from "@/helpers/revenue-change";
import type { RevenueByPlanDto } from "@/types/revenue";
import { formatCurrency } from "@/utils/format-currency";

const HELP = {
  revenue:
    "Revenue collected from paid invoices for this plan in the selected period. The line below is the plan's share of total revenue.",
  growth:
    "Change in this plan's revenue vs. the previous period of the same length. Shows “New” when the previous period had no revenue to compare against.",
  purchases:
    "Successful payments for this plan in the selected period. The line below counts distinct paying customers.",
  arpu: "Average revenue per user: this plan's revenue divided by the number of distinct customers who paid for it in the period.",
  retention: `Customers on this plan at the start of the period who are still paying (on any plan) at the end, divided by the customers at the start. Needs at least 5 customers at the start; below ${LOW_RETENTION_PERCENT}% is highlighted.`,
};

interface RevenueByPlanCardProps {
  plans: RevenueByPlanDto[];
  currency: "VND" | "USD";
}

export function RevenueByPlanCard({ plans, currency }: RevenueByPlanCardProps) {
  // Shared by the donut and the table so hovering either highlights the same plan in both.
  const [activePlan, setActivePlan] = useState<string | null>(null);

  const totalPlanRevenue = useMemo(() => plans.reduce((acc, p) => acc + p.amount, 0), [plans]);
  const totalPurchases = useMemo(() => plans.reduce((acc, p) => acc + p.purchaseCount, 0), [plans]);
  const leaders = useMemo(() => pickPlanLeaders(plans), [plans]);
  const topPlan = plans[0]; // the API sorts by revenue

  // A column of nothing but "—" adds noise; retention only appears once some plan has enough history.
  const showRetention = plans.some((p) => p.retentionRate != null);

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="@container flex h-full flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Revenue by Plan</h3>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              How each plan contributes in the selected period
            </p>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-800">
            No plan revenue in this period.
          </div>
        ) : (
          <>
            {/* Summary strip: compact donut + headline numbers, so the donut never floats in empty space */}
            <div className="flex items-center gap-5 rounded-xl bg-slate-50/80 p-3 dark:bg-slate-800/40">
              <div className="relative size-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload as RevenueByPlanDto;
                        return (
                          <div className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{data.planName}</p>
                            <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                              {formatCurrency(data.amount, currency)}
                            </p>
                            <p className="text-[10px] text-slate-400">{data.percentage}% of revenue</p>
                          </div>
                        );
                      }}
                    />
                    <Pie
                      data={totalPlanRevenue > 0 ? plans : [{ planName: "Empty", amount: 1 }]}
                      dataKey="amount"
                      nameKey="planName"
                      innerRadius={36}
                      outerRadius={54}
                      paddingAngle={totalPlanRevenue > 0 ? 2 : 0}
                      stroke="none"
                      onMouseEnter={(_, index) => totalPlanRevenue > 0 && setActivePlan(plans[index]?.planName ?? null)}
                      onMouseLeave={() => setActivePlan(null)}
                    >
                      {totalPlanRevenue > 0 ? (
                        plans.map((entry, index) => (
                          <Cell
                            key={entry.planName}
                            fill={getPlanColor(entry.planName, index)}
                            fillOpacity={activePlan === null || activePlan === entry.planName ? 1 : 0.25}
                          />
                        ))
                      ) : (
                        <Cell fill="#e2e8f0" className="dark:fill-slate-700" />
                      )}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-2.5 @md:grid-cols-2">
                <Stat label="Total revenue" value={formatCurrency(totalPlanRevenue, currency)} emphasis />
                <Stat label="Plans · Purchases" value={`${plans.length} · ${totalPurchases}`} />
                {topPlan && totalPlanRevenue > 0 && (
                  <Stat label="Top plan" value={`${topPlan.planName} · ${topPlan.percentage}%`} className="@md:col-span-2" />
                )}
              </div>
            </div>

            {/* Per-plan table */}
            <div className="min-w-0">
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:border-slate-800">
                    <th className="pb-2 text-left font-semibold">Plan</th>
                    <HeaderCell label="Revenue" help={HELP.revenue} />
                    <HeaderCell label="Growth" help={HELP.growth} />
                    <HeaderCell label="Purchases" help={HELP.purchases} />
                    <HeaderCell label="ARPU" help={HELP.arpu} />
                    {showRetention && <HeaderCell label="Retention" help={HELP.retention} />}
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan, idx) => {
                    const isActive = activePlan === plan.planName;
                    const isDimmed = activePlan !== null && !isActive;
                    const growthTone = changeTone(plan.percentageChange);
                    // `== null` also covers fields missing from an older API build: show "—", never "0 ₫" or "%".
                    const lowRetention = plan.retentionRate != null && plan.retentionRate < LOW_RETENTION_PERCENT;

                    return (
                      <tr
                        key={plan.planName}
                        onMouseEnter={() => setActivePlan(plan.planName)}
                        onMouseLeave={() => setActivePlan(null)}
                        className={`border-b border-slate-100 align-middle transition-colors last:border-0 dark:border-slate-800 ${
                          isActive ? "bg-slate-50 dark:bg-slate-800/60" : ""
                        } ${isDimmed ? "opacity-45" : ""}`}
                      >
                        <td className="py-2.5 pr-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: getPlanColor(plan.planName, idx) }}
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{plan.planName}</span>
                            {plan.planName === leaders.mostPurchased && (
                              <Hint text={`Most successful payments in this period (${plan.purchaseCount})`}>
                                <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-orange-50 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-orange-700 ring-1 ring-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800/60">
                                  <Star className="h-2 w-2 fill-orange-500 text-orange-500" />
                                  Most purchased
                                </span>
                              </Hint>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(plan.amount, currency)}
                          </div>
                          <div className="text-[10px] text-slate-400">{plan.percentage}% of total</div>
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                          {plan.percentageChange == null ? (
                            <Hint text="The previous period had no revenue for this plan, so there is no percentage to compare.">
                              <span className="inline-flex cursor-help rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {formatChange(plan.percentageChange, plan.amount)}
                              </span>
                            </Hint>
                          ) : (
                            <span className={`font-semibold ${CHANGE_TONE_CLASS[growthTone]}`}>
                              {formatChange(plan.percentageChange, plan.amount)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{plan.purchaseCount}</div>
                          {plan.uniqueCustomers != null && (
                            <div className="text-[10px] text-slate-400">
                              {plan.uniqueCustomers} {plan.uniqueCustomers === 1 ? "customer" : "customers"}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-semibold whitespace-nowrap text-slate-900 dark:text-slate-100">
                          <span className="inline-flex items-center gap-1">
                            {plan.planName === leaders.topArpu && <LeaderStar label="Highest ARPU" />}
                            {plan.arpu != null ? formatCurrency(plan.arpu, currency) : "—"}
                          </span>
                        </td>
                        {showRetention && (
                          <td className="py-2.5 pl-2 text-right font-semibold whitespace-nowrap">
                            {plan.retentionRate == null ? (
                              <Hint text={`Not enough data: ${plan.retentionBase ?? 0} customer(s) at the start of the period, at least 5 needed.`}>
                                <span className="cursor-help text-slate-400">—</span>
                              </Hint>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  lowRetention ? "text-orange-600 dark:text-orange-400" : "text-slate-900 dark:text-slate-100"
                                }`}
                              >
                                {plan.planName === leaders.topRetention && <LeaderStar label="Highest retention" />}
                                {plan.retentionRate}%
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!showRetention && (
                <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                  Retention appears once a plan had at least 5 paying customers at the start of the period.
                </p>
              )}
            </div>
          </>
        )}
      </Card>
    </TooltipProvider>
  );
}

function Stat({
  label,
  value,
  emphasis = false,
  className = "",
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
      <p
        className={`truncate font-bold text-slate-900 dark:text-slate-100 ${emphasis ? "text-lg tracking-tight" : "text-sm"}`}
      >
        {value}
      </p>
    </div>
  );
}

function HeaderCell({ label, help }: { label: string; help: string }) {
  return (
    <th className="pb-2 pl-2 text-right font-semibold">
      <Hint text={help}>
        <button
          type="button"
          className="inline-flex cursor-help items-center gap-0.5 uppercase hover:text-slate-600 focus:outline-none dark:hover:text-slate-300"
        >
          {label}
          <HelpCircle className="h-2.5 w-2.5" />
        </button>
      </Hint>
    </th>
  );
}

function Hint({ text, children }: { text: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs font-normal normal-case">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function LeaderStar({ label }: { label: string }) {
  return (
    <Hint text={label}>
      <Star aria-label={label} className="h-2.5 w-2.5 shrink-0 cursor-help fill-amber-400 text-amber-400" />
    </Hint>
  );
}
