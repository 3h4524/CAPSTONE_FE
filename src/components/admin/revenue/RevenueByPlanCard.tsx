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
import {
  getPlanColor,
  LOW_RETENTION_PERCENT,
  pickPlanLeaders,
} from "@/helpers/revenue-by-plan";
import { CHANGE_TONE_CLASS, changeTone, formatChange } from "@/helpers/revenue-change";
import type { RevenueByPlanDto } from "@/types/revenue";
import { formatVnd } from "@/utils/format-currency";

const HELP = {
  revenue:
    "Revenue collected from paid invoices for this plan in the selected period. The line below is the plan's share of total revenue.",
  growth:
    "Cash collected vs. the previous period of the same length. An annual payment counts in full in the month it is paid, so it can rise while MRR falls. Shows “New” when the previous period had no revenue.",
  purchases:
    "Successful payments for this plan in the selected period. The line below counts distinct paying customers.",
  arpu: "Average revenue per user: this plan's revenue divided by the number of distinct customers who paid for it in the period.",
  mrrChange:
    "Monthly recurring revenue at the end of the period minus at its start. An annual plan adds 1/12 of its price and every customer who leaves lowers it, so it shows where next month's revenue is heading. The line below is the plan's MRR at the end.",
  customers:
    "Paying customers on this plan at the start of the period and at its end, counted like MRR. The line below bridges the two: customers who stopped paying, who switched to another plan (still paying, so still retained) and who joined (new or switched in). Hover a row's numbers for the full split.",
  retention: `Of the customers on this plan at the start, the share still paying at the end, on this plan or another. Customers who joined during the period do not count here, so it can be low while the plan grows. Needs at least 5 customers at the start; below ${LOW_RETENTION_PERCENT}% is highlighted.`,
};

type View = "revenue" | "health";

const VIEWS: { key: View; label: string; description: string }[] = [
  { key: "revenue", label: "Revenue", description: "What each plan collected in the selected period" },
  { key: "health", label: "Health", description: "Whether each plan's recurring revenue and customers are growing, and whether it keeps them" },
];

interface RevenueByPlanCardProps {
  plans?: RevenueByPlanDto[];
  isLoading?: boolean;
}

export function RevenueByPlanCard({ plans: plansProp, isLoading = false }: RevenueByPlanCardProps) {
  // Shared by the donut and the table so hovering either highlights the same plan in both.
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [view, setView] = useState<View>("revenue");

  const plans = useMemo(() => plansProp ?? [], [plansProp]);
  const totalPlanRevenue = useMemo(() => plans.reduce((acc, p) => acc + p.amount, 0), [plans]);
  const totalPurchases = useMemo(() => plans.reduce((acc, p) => acc + p.purchaseCount, 0), [plans]);
  const leaders = useMemo(() => pickPlanLeaders(plans), [plans]);
  const topPlan = plans[0]; // the API sorts by revenue
  const centerPlan = plans.find((plan) => plan.planName === activePlan) ?? topPlan;

  if (isLoading || !plansProp) {
    return (
      <Card className="h-[420px] animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="h-6 w-36 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-[320px] rounded-xl bg-slate-100 dark:bg-slate-800/60" />
      </Card>
    );
  }

  const rowProps = (planName: string) => ({
    onMouseEnter: () => setActivePlan(planName),
    onMouseLeave: () => setActivePlan(null),
    className: `border-b border-slate-100 align-middle transition-colors last:border-0 dark:border-slate-800 ${
      activePlan === planName ? "bg-slate-50 dark:bg-slate-800/60" : ""
    } ${activePlan !== null && activePlan !== planName ? "opacity-45" : ""}`,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="@container flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Revenue by Plan</h3>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {VIEWS.find((v) => v.key === view)!.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label="Revenue by plan view" className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              {VIEWS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={view === item.key}
                  onClick={() => setView(item.key)}
                  className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    view === item.key
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-xs text-slate-400 dark:border-slate-800">
            No plan revenue in this period.
          </div>
        ) : (
          <div className="flex flex-col gap-5 @3xl:flex-row">
            {/* Donut + headline numbers */}
            <div className="flex shrink-0 flex-col items-center justify-center gap-4 rounded-xl bg-slate-50/80 px-4 py-3 @3xl:w-96 dark:bg-slate-800/40">
              <div className="relative size-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload as RevenueByPlanDto;
                        return (
                          <div className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{data.planName}</p>
                            <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{formatVnd(data.amount)}</p>
                            <p className="text-[10px] text-slate-400">{data.percentage}% of revenue</p>
                          </div>
                        );
                      }}
                    />
                    <Pie
                      data={totalPlanRevenue > 0 ? plans : [{ planName: "Empty", amount: 1 }]}
                      dataKey="amount"
                      nameKey="planName"
                      innerRadius={46}
                      outerRadius={70}
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
                {/* The hovered plan, or the top plan, in the hole of the donut. */}
                {centerPlan && totalPlanRevenue > 0 && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg leading-none font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                      {centerPlan.percentage}%
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getPlanColor(centerPlan.planName, plans.indexOf(centerPlan)) }} />
                      {centerPlan.planName}
                    </span>
                    <span className="text-[9px] text-slate-400">of revenue</span>
                  </div>
                )}
              </div>
              {/* The three headline figures side by side under the donut, split by faint rules. */}
              <div className="flex w-full justify-between divide-x divide-slate-200/80 dark:divide-slate-700/60">
                <Stat label="Total revenue" value={formatVnd(totalPlanRevenue)} emphasis />
                <Stat label="Plans · Purchases" value={`${plans.length} · ${totalPurchases}`} />
                {topPlan && totalPlanRevenue > 0 && <Stat label="Top plan" value={`${topPlan.planName} · ${topPlan.percentage}%`} />}
              </div>
            </div>

            {/* Per-plan table */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs tabular-nums">
                  {view === "revenue" ? (
                    <>
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:border-slate-800">
                          <th className="w-[1%] pr-6 pb-2 text-left font-semibold whitespace-nowrap">Plan</th>
                          <HeaderCell label="Revenue" help={HELP.revenue} />
                          <HeaderCell label="Growth" help={HELP.growth} />
                          <HeaderCell label="Purchases" help={HELP.purchases} />
                          <HeaderCell label="ARPU" help={HELP.arpu} />
                        </tr>
                      </thead>
                      <tbody>
                        {plans.map((plan, idx) => (
                          <tr key={plan.planName} {...rowProps(plan.planName)}>
                            <PlanCell plan={plan} index={idx} badge={plan.planName === leaders.mostPurchased ? `Most successful payments in this period (${plan.purchaseCount})` : null} />
                            <td className="px-2 py-3 text-center whitespace-nowrap">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{formatVnd(plan.amount)}</div>
                              <div className="text-[10px] text-slate-400">{plan.percentage}% of total</div>
                            </td>
                            <td className="px-2 py-3 text-center whitespace-nowrap">
                              {plan.percentageChange == null ? (
                                <Hint text="The previous period had no revenue for this plan, so there is no percentage to compare.">
                                  <span className="inline-flex cursor-help rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    {formatChange(plan.percentageChange, plan.amount)}
                                  </span>
                                </Hint>
                              ) : (
                                <span className={`font-semibold ${CHANGE_TONE_CLASS[changeTone(plan.percentageChange)]}`}>
                                  {formatChange(plan.percentageChange, plan.amount)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center whitespace-nowrap">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">{plan.purchaseCount}</div>
                              {plan.uniqueCustomers != null && (
                                <div className="text-[10px] text-slate-400">
                                  {plan.uniqueCustomers} {plan.uniqueCustomers === 1 ? "customer" : "customers"}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center font-semibold whitespace-nowrap text-slate-900 dark:text-slate-100">
                              <span className="inline-flex items-center gap-1">
                                {plan.planName === leaders.topArpu && <LeaderStar label="Highest ARPU" />}
                                {plan.arpu != null ? formatVnd(plan.arpu) : "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  ) : (
                    <>
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-semibold tracking-wide text-slate-400 uppercase dark:border-slate-800">
                          <th className="w-[1%] pr-6 pb-2 text-left font-semibold whitespace-nowrap">Plan</th>
                          <HeaderCell label="MRR change" help={HELP.mrrChange} />
                          <HeaderCell label="Customers" help={HELP.customers} />
                          <HeaderCell label="Retention" help={HELP.retention} />
                        </tr>
                      </thead>
                      <tbody>
                        {plans.map((plan, idx) => {
                          const mrrDelta = plan.mrrEnd - plan.mrrStart;
                          const lowRetention = plan.retentionRate != null && plan.retentionRate < LOW_RETENTION_PERCENT;
                          const retained = plan.customers.stayed + plan.customers.switchedOut;
                          return (
                            <tr key={plan.planName} {...rowProps(plan.planName)}>
                              <PlanCell plan={plan} index={idx} badge={null} />
                              <td className="px-2 py-3 text-center whitespace-nowrap">
                                <div className={`font-semibold ${CHANGE_TONE_CLASS[changeTone(plan.mrrChangePercent)]}`}>
                                  {mrrDelta === 0 ? "0 ₫" : `${mrrDelta > 0 ? "+" : "−"}${formatVnd(Math.abs(mrrDelta))}`}
                                  {plan.mrrChangePercent != null && ` (${formatChange(plan.mrrChangePercent, plan.mrrEnd)})`}
                                </div>
                                <div className="text-[10px] text-slate-400">MRR {formatVnd(plan.mrrEnd)}</div>
                              </td>
                              <td className="px-2 py-3 text-center whitespace-nowrap">
                                {/* Start to end at a glance; who stopped, switched and joined on hover. */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex cursor-help items-center gap-1.5">
                                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {plan.customers.start} → {plan.customers.end}
                                      </span>
                                      <NetChip value={plan.customers.end - plan.customers.start} />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="w-56 p-3 text-xs font-normal normal-case">
                                    <CustomerFlow planName={plan.planName} flow={plan.customers} />
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="px-2 py-3 text-center whitespace-nowrap">
                                {plan.retentionRate == null ? (
                                  <Hint text={`Not enough data: ${plan.customers.start} customer(s) at the start of the period, at least 5 needed.`}>
                                    <span className="cursor-help font-semibold text-slate-400">—</span>
                                  </Hint>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 font-semibold ${
                                      lowRetention ? "text-orange-600 dark:text-orange-400" : "text-slate-900 dark:text-slate-100"
                                    }`}
                                  >
                                    {plan.planName === leaders.topRetention && <LeaderStar label="Highest retention" />}
                                    {plan.retentionRate}%
                                  </span>
                                )}
                                {plan.customers.start > 0 && (
                                  <div className="text-[10px] text-slate-400">
                                    {retained} of {plan.customers.start} still paying
                                    {plan.customers.switchedOut > 0 && ` (${plan.customers.switchedOut} on another plan)`}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </>
                  )}
                </table>
              </div>

            </div>
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}

function PlanCell({ plan, index, badge }: { plan: RevenueByPlanDto; index: number; badge: string | null }) {
  return (
    <td className="py-3 pr-6 whitespace-nowrap">
      <div className="flex min-w-0 items-center gap-x-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getPlanColor(plan.planName, index) }} />
        <span className="font-semibold text-slate-800 dark:text-slate-100">{plan.planName}</span>
        {badge && (
          <Hint text={badge}>
            <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-orange-50 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-orange-700 ring-1 ring-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800/60">
              <Star className="h-2 w-2 fill-orange-500 text-orange-500" />
              Most purchased
            </span>
          </Hint>
        )}
      </div>
    </td>
  );
}

function NetChip({ value }: { value: number }) {
  const tone =
    value > 0
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : value < 0
        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  return (
    <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${tone}`}>
      {value > 0 ? "+" : value < 0 ? "−" : "±"}
      {Math.abs(value)}
    </span>
  );
}

// The customer bridge as a small table on the dark tooltip: start, who left or switched, who joined, end.
function CustomerFlow({ planName, flow }: { planName: string; flow: RevenueByPlanDto["customers"] }) {
  const rows = [
    { label: "Stopped paying", value: -flow.stoppedPaying, tone: "text-rose-300" },
    { label: "Switched to another plan", value: -flow.switchedOut, tone: "text-amber-300" },
    { label: "New customers", value: flow.new, tone: "text-emerald-300" },
    { label: "Switched in", value: flow.switchedIn, tone: "text-emerald-300" },
  ].filter((row) => row.value !== 0);
  return (
    <div className="flex flex-col gap-1 tabular-nums">
      <p className="mb-0.5 font-semibold text-white">{planName} customers</p>
      <FlowLine label="At the start" value={String(flow.start)} />
      {rows.map((row) => (
        <FlowLine key={row.label} label={row.label} value={`${row.value > 0 ? "+" : "−"}${Math.abs(row.value)}`} tone={row.tone} />
      ))}
      <div className="mt-0.5 border-t border-white/15 pt-1">
        <FlowLine label="At the end" value={String(flow.end)} strong />
      </div>
      <p className="mt-1 text-[10px] text-slate-300">{flow.stayed} stayed on the plan the whole period.</p>
    </div>
  );
}

function FlowLine({ label, value, tone, strong }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "font-semibold" : "opacity-80"}>{label}</span>
      <span className={`font-semibold ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="text-[10px] font-semibold tracking-wide whitespace-nowrap text-slate-400 uppercase">{label}</p>
      <p className={`font-bold whitespace-nowrap text-slate-900 dark:text-slate-100 ${emphasis ? "text-base tracking-tight" : "text-sm"}`}>
        {value}
      </p>
    </div>
  );
}

function HeaderCell({ label, help }: { label: string; help: string }) {
  return (
    <th className="px-2 pb-2 text-center font-semibold">
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
