"use client";

import React, { useMemo, useState } from "react";
import { HelpCircle, Package, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { useIsPhone } from "@/hooks/use-is-phone";
import type { RevenueByPlanDto } from "@/types/revenue";
import { formatVnd } from "@/utils/format-currency";

type View = "revenue" | "health";

const VIEWS: View[] = ["revenue", "health"];

interface RevenueByPlanCardProps {
  plans?: RevenueByPlanDto[];
  isLoading?: boolean;
}

export function RevenueByPlanCard({ plans: plansProp, isLoading = false }: RevenueByPlanCardProps) {
  const isPhone = useIsPhone();
  const { t } = useTranslation("common");
  const changeLabel = (raw: string) => (raw === "New" ? t("admin.revenue.common.new") : raw);
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
      <Card className="border-ink-200/80 bg-card h-[420px] animate-pulse rounded-2xl border p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-ink-200 h-6 w-36 rounded dark:bg-slate-800" />
        <div className="bg-ink-100 mt-4 h-[320px] rounded-xl dark:bg-slate-800/60" />
      </Card>
    );
  }

  const rowProps = (planName: string) => ({
    onMouseEnter: () => setActivePlan(planName),
    onMouseLeave: () => setActivePlan(null),
    className: `border-b border-ink-100 align-middle transition-colors last:border-0 dark:border-slate-800 ${
      activePlan === planName ? "bg-ink-50 dark:bg-slate-800/60" : ""
    } ${activePlan !== null && activePlan !== planName ? "opacity-45" : ""}`,
  });

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="border-ink-200/80 bg-card @container flex flex-col gap-4 rounded-2xl border p-5 shadow-xs transition-shadow hover:shadow-md max-md:p-4 dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-ink-900 text-sm font-bold dark:text-slate-100">{t("admin.revenue.byPlan.title")}</h3>
              <p className="text-ink-400 text-[11px] font-medium dark:text-slate-500">
                {t(`admin.revenue.byPlan.views.${view}.description`)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label={t("admin.revenue.byPlan.viewTablistAria")} className="bg-ink-100 flex rounded-lg p-0.5 dark:bg-slate-800">
              {VIEWS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={view === item}
                  onClick={() => setView(item)}
                  className={`phone-hit-area cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                    view === item
                      ? "bg-card text-ink-900 shadow-xs dark:bg-slate-700 dark:text-slate-100"
                      : "text-ink-500 hover:text-ink-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {t(`admin.revenue.byPlan.views.${item}.label`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="border-ink-200 text-ink-400 flex flex-1 items-center justify-center rounded-xl border border-dashed py-10 text-xs dark:border-slate-800">
            {t("admin.revenue.byPlan.empty")}
          </div>
        ) : (
          <div className="flex flex-col gap-5 @3xl:flex-row">
            {/* Donut + headline numbers */}
            <div className="bg-ink-50/80 flex shrink-0 flex-col items-center justify-center gap-4 rounded-xl px-4 py-3 @3xl:w-96 dark:bg-slate-800/40">
              <div className="relative size-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload as RevenueByPlanDto;
                        return (
                          <div className="border-ink-200/80 bg-card rounded-xl border px-2.5 py-1.5 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-ink-800 text-xs font-bold dark:text-slate-200">{data.planName}</p>
                            <p className="text-ink-900 text-xs font-extrabold dark:text-slate-100">{formatVnd(data.amount)}</p>
                            <p className="text-ink-400 text-[10px]">{t("admin.revenue.byPlan.percentOfRevenue", { percent: data.percentage })}</p>
                          </div>
                        );
                      }}
                    />
                    <Pie
                      data={totalPlanRevenue > 0 ? plans : [{ planName: t("admin.revenue.byPlan.emptyLabel"), amount: 1 }]}
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
                        <Cell fill="var(--ink-200)" className="dark:fill-slate-700" />
                      )}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* The hovered plan, or the top plan, in the hole of the donut. */}
                {centerPlan && totalPlanRevenue > 0 && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-ink-900 text-lg leading-none font-bold tracking-tight tabular-nums dark:text-slate-100">
                      {centerPlan.percentage}%
                    </span>
                    <span className="text-ink-500 mt-1 flex items-center gap-1 text-[10px] font-semibold dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getPlanColor(centerPlan.planName, plans.indexOf(centerPlan)) }} />
                      {centerPlan.planName}
                    </span>
                    <span className="text-ink-400 text-[9px]">{t("admin.revenue.byPlan.ofRevenue")}</span>
                  </div>
                )}
              </div>
              {/* The three headline figures side by side under the donut, split by faint rules. */}
              <div className="divide-ink-200/80 flex w-full justify-between divide-x dark:divide-slate-700/60">
                <Stat label={t("admin.revenue.byPlan.statTotalRevenue")} value={formatVnd(totalPlanRevenue)} emphasis />
                <Stat label={t("admin.revenue.byPlan.statPlansPurchases")} value={`${plans.length} · ${totalPurchases}`} />
                {topPlan && totalPlanRevenue > 0 && <Stat label={t("admin.revenue.byPlan.statTopPlan")} value={`${topPlan.planName} · ${topPlan.percentage}%`} />}
              </div>
            </div>

            {/* Per-plan table */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {isPhone ? (
                <ul className="divide-ink-100 divide-y dark:divide-slate-800">
                  {plans.map((plan, idx) => (
                    <PlanSummary key={plan.planName} plan={plan} index={idx} view={view} isMostPurchased={plan.planName === leaders.mostPurchased} />
                  ))}
                </ul>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-xs tabular-nums">
                  {view === "revenue" ? (
                    <>
                      <thead>
                        <tr className="border-ink-100 text-ink-400 border-b text-[10px] font-semibold tracking-wide uppercase dark:border-slate-800">
                          <th className="w-[1%] pr-6 pb-2 text-left font-semibold whitespace-nowrap">{t("admin.revenue.byPlan.planColumn")}</th>
                          <HeaderCell label={t("admin.revenue.byPlan.views.revenue.label")} help={t("admin.revenue.byPlan.help.revenue")} />
                          <HeaderCell label={t("admin.revenue.byPlan.growthColumn")} help={t("admin.revenue.byPlan.help.growth")} />
                          <HeaderCell label={t("admin.revenue.byPlan.purchasesColumn")} help={t("admin.revenue.byPlan.help.purchases")} />
                          <HeaderCell label="ARPU" help={t("admin.revenue.byPlan.help.arpu")} />
                        </tr>
                      </thead>
                      <tbody>
                        {plans.map((plan, idx) => (
                          <tr key={plan.planName} {...rowProps(plan.planName)}>
                            <PlanCell plan={plan} index={idx} badge={plan.planName === leaders.mostPurchased ? t("admin.revenue.byPlan.mostSuccessfulPayments", { count: plan.purchaseCount }) : null} />
                            <td className="px-2 py-3 text-center whitespace-nowrap">
                              <div className="text-ink-900 font-semibold dark:text-slate-100">{formatVnd(plan.amount)}</div>
                              <div className="text-ink-400 text-[10px]">{t("admin.revenue.byPlan.percentOfTotal", { percent: plan.percentage })}</div>
                            </td>
                            <td className="px-2 py-3 text-center whitespace-nowrap">
                              {plan.percentageChange == null ? (
                                <Hint text={t("admin.revenue.byPlan.noPreviousRevenue")}>
                                  <span className="bg-ink-100 text-ink-500 inline-flex cursor-help rounded-full px-1.5 py-px text-[10px] font-semibold dark:bg-slate-800 dark:text-slate-400">
                                    {changeLabel(formatChange(plan.percentageChange, plan.amount))}
                                  </span>
                                </Hint>
                              ) : (
                                <span className={`font-semibold ${CHANGE_TONE_CLASS[changeTone(plan.percentageChange)]}`}>
                                  {changeLabel(formatChange(plan.percentageChange, plan.amount))}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center whitespace-nowrap">
                              <div className="text-ink-900 font-semibold dark:text-slate-100">{plan.purchaseCount}</div>
                              {plan.uniqueCustomers != null && (
                                <div className="text-ink-400 text-[10px]">
                                  {t("admin.revenue.common.customerCount", { count: plan.uniqueCustomers })}
                                </div>
                              )}
                            </td>
                            <td className="text-ink-900 px-2 py-3 text-center font-semibold whitespace-nowrap dark:text-slate-100">
                              <span className="inline-flex items-center gap-1">
                                {plan.planName === leaders.topArpu && <LeaderStar label={t("admin.revenue.byPlan.highestArpu")} />}
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
                        <tr className="border-ink-100 text-ink-400 border-b text-[10px] font-semibold tracking-wide uppercase dark:border-slate-800">
                          <th className="w-[1%] pr-6 pb-2 text-left font-semibold whitespace-nowrap">{t("admin.revenue.byPlan.planColumn")}</th>
                          <HeaderCell label={t("admin.revenue.byPlan.mrrChangeColumn")} help={t("admin.revenue.byPlan.help.mrrChange")} />
                          <HeaderCell label={t("admin.revenue.byPlan.customersColumn")} help={t("admin.revenue.byPlan.help.customers")} />
                          <HeaderCell label={t("admin.revenue.byPlan.retentionColumn")} help={t("admin.revenue.byPlan.help.retention", { percent: LOW_RETENTION_PERCENT })} />
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
                                  {plan.mrrChangePercent != null && ` (${changeLabel(formatChange(plan.mrrChangePercent, plan.mrrEnd))})`}
                                </div>
                                <div className="text-ink-400 text-[10px]">{t("admin.revenue.byPlan.mrrAtEnd", { value: formatVnd(plan.mrrEnd) })}</div>
                              </td>
                              <td className="px-2 py-3 text-center whitespace-nowrap">
                                {/* Start to end at a glance; who stopped, switched and joined on hover. */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex cursor-help items-center gap-1.5">
                                      <span className="text-ink-900 font-semibold dark:text-slate-100">
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
                                  <Hint text={t("admin.revenue.byPlan.notEnoughRetentionData", { count: plan.customers.start })}>
                                    <span className="text-ink-400 cursor-help font-semibold">—</span>
                                  </Hint>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 font-semibold ${
                                      lowRetention ? "text-orange-600 dark:text-orange-400" : "text-ink-900 dark:text-slate-100"
                                    }`}
                                  >
                                    {plan.planName === leaders.topRetention && <LeaderStar label={t("admin.revenue.byPlan.highestRetention")} />}
                                    {plan.retentionRate}%
                                  </span>
                                )}
                                {plan.customers.start > 0 && (
                                  <div className="text-ink-400 text-[10px]">
                                    {t("admin.revenue.byPlan.stillPaying", { retained, start: plan.customers.start })}
                                    {plan.customers.switchedOut > 0 && ` ${t("admin.revenue.byPlan.onAnotherPlan", { count: plan.customers.switchedOut })}`}
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
              )}

            </div>
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}

/** A plan on a phone: its main figure on the first line and the rest in one short line under it. */
function PlanSummary({ plan, index, view, isMostPurchased }: { plan: RevenueByPlanDto; index: number; view: View; isMostPurchased: boolean }) {
  const { t } = useTranslation("common");
  const changeLabel = (raw: string) => (raw === "New" ? t("admin.revenue.common.new") : raw);
  const mrrDelta = plan.mrrEnd - plan.mrrStart;
  const isRevenue = view === "revenue";
  const main = isRevenue
    ? formatVnd(plan.amount)
    : mrrDelta === 0
      ? "0 ₫"
      : `${mrrDelta > 0 ? "+" : "−"}${formatVnd(Math.abs(mrrDelta))}`;
  const details = isRevenue
    ? [
        `${plan.percentage}%`,
        t("admin.revenue.byPlan.purchaseCount", { count: plan.purchaseCount }),
        plan.arpu == null ? null : `ARPU ${formatVnd(plan.arpu)}`,
        changeLabel(formatChange(plan.percentageChange, plan.amount)),
      ]
    : [
        t("admin.revenue.byPlan.mrrAtEnd", { value: formatVnd(plan.mrrEnd) }),
        t("admin.revenue.byPlan.customersArrow", { start: plan.customers.start, end: plan.customers.end }),
        plan.retentionRate == null ? null : t("admin.revenue.byPlan.percentRetained", { percent: plan.retentionRate }),
      ];

  return (
    <li className="py-2.5 text-xs tabular-nums">
      <p className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getPlanColor(plan.planName, index) }} />
        <span className="text-ink-800 min-w-0 truncate font-semibold dark:text-slate-100">{plan.planName}</span>
        {isRevenue && isMostPurchased && (
          <Star className="h-3 w-3 shrink-0 fill-orange-500 text-orange-500" role="img" aria-label={t("admin.revenue.byPlan.mostPurchased")} />
        )}
        <span
          className={`ml-auto shrink-0 font-semibold ${
            isRevenue ? "text-ink-900 dark:text-slate-100" : CHANGE_TONE_CLASS[changeTone(plan.mrrChangePercent)]
          }`}
        >
          {main}
        </span>
      </p>
      <p className="text-ink-500 mt-0.5 pl-4 text-[11px] dark:text-slate-400">{details.filter(Boolean).join(" · ")}</p>
    </li>
  );
}

function PlanCell({ plan, index, badge }: { plan: RevenueByPlanDto; index: number; badge: string | null }) {
  const { t } = useTranslation("common");
  return (
    <td className="py-3 pr-6 whitespace-nowrap">
      <div className="flex min-w-0 items-center gap-x-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getPlanColor(plan.planName, index) }} />
        <span className="text-ink-800 font-semibold dark:text-slate-100">{plan.planName}</span>
        {badge && (
          <Hint text={badge}>
            <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-orange-50 px-1.5 py-px text-[9px] font-semibold whitespace-nowrap text-orange-700 ring-1 ring-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800/60">
              <Star className="h-2 w-2 fill-orange-500 text-orange-500" />
              {t("admin.revenue.byPlan.mostPurchased")}
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
        : "bg-ink-100 text-ink-500 dark:bg-slate-800 dark:text-slate-400";
  return (
    <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${tone}`}>
      {value > 0 ? "+" : value < 0 ? "−" : "±"}
      {Math.abs(value)}
    </span>
  );
}

// The customer bridge as a small table on the dark tooltip: start, who left or switched, who joined, end.
function CustomerFlow({ planName, flow }: { planName: string; flow: RevenueByPlanDto["customers"] }) {
  const { t } = useTranslation("common");
  const rows = [
    { label: t("admin.revenue.byPlan.stoppedPaying"), value: -flow.stoppedPaying, tone: "text-rose-300" },
    { label: t("admin.revenue.byPlan.switchedToAnotherPlan"), value: -flow.switchedOut, tone: "text-amber-300" },
    { label: t("admin.revenue.byPlan.newCustomers"), value: flow.new, tone: "text-emerald-300" },
    { label: t("admin.revenue.byPlan.switchedIn"), value: flow.switchedIn, tone: "text-emerald-300" },
  ].filter((row) => row.value !== 0);
  return (
    <div className="flex flex-col gap-1 tabular-nums">
      <p className="mb-0.5 font-semibold text-white">{t("admin.revenue.byPlan.planCustomers", { plan: planName })}</p>
      <FlowLine label={t("admin.revenue.byPlan.atStart")} value={String(flow.start)} />
      {rows.map((row) => (
        <FlowLine key={row.label} label={row.label} value={`${row.value > 0 ? "+" : "−"}${Math.abs(row.value)}`} tone={row.tone} />
      ))}
      <div className="mt-0.5 border-t border-white/15 pt-1">
        <FlowLine label={t("admin.revenue.byPlan.atEnd")} value={String(flow.end)} strong />
      </div>
      <p className="text-ink-300 mt-1 text-[10px]">{t("admin.revenue.byPlan.stayedWholePeriod", { count: flow.stayed })}</p>
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
    <div className="min-w-0 px-3 first:pl-0 last:pr-0 max-md:flex-1">
      <p className="text-ink-400 text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase">{label}</p>
      <p className={`text-ink-900 font-bold whitespace-nowrap max-md:wrap-anywhere max-md:whitespace-normal dark:text-slate-100 ${emphasis ? "text-base tracking-tight" : "text-sm"}`}>
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
          className="hover:text-ink-600 inline-flex cursor-help items-center gap-0.5 uppercase focus:outline-none dark:hover:text-slate-300"
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
