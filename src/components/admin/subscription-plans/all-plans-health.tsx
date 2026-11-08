import { ArrowDownRight, ArrowUpRight, ChevronRight, LineChart, Table2 } from "lucide-react";

import { MrrBridgeStrip } from "@/components/admin/subscription-plans/mrr-bridge-strip";
import { Figures, OUTLOOK_CHIP, OUTLOOK_ICON, Section, STATUS_STYLE } from "@/components/admin/subscription-plans/plan-health-parts";
import { Card } from "@/components/ui/card";
import { OUTLOOK_LABEL, planName, STATUS_LABEL } from "@/helpers/plan-ai-review";
import type { PlanAiAssessment, PlanAiReviewSnapshot, PlanAiScore } from "@/types/plan-ai-review";
import type { MrrBridgeDto } from "@/types/revenue";
import { cn } from "@/utils/cn";
import { formatCompactVndAmount } from "@/utils/format-currency";


/** The first tile in Plan health: every plan together, picked like a plan, tinted so it reads first. */
export function AllPlansTile({
  planCount,
  paying,
  onTrial,
  bridge,
  selected,
  onSelect,
}: {
  planCount: number;
  // Paying subscribers and running trials now, from Plan Insights; unknown until it loads.
  paying?: number;
  onTrial?: number;
  bridge?: MrrBridgeDto;
  selected: boolean;
  onSelect: () => void;
}) {
  const net = bridge ? bridge.end - bridge.start : null;
  const pct = bridge && net !== null && bridge.start > 0 ? (net / bridge.start) * 100 : null;
  const Trend = net !== null && net < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        selected ? "border-[#2a9d8f] bg-[#2a9d8f]/5 shadow-md ring-2 ring-[#2a9d8f]/25" : "border-slate-200 shadow-xs"
      )}
    >
      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">All plans</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
        {paying !== undefined ? (
          <>
            <span className="text-3xl leading-none font-bold tracking-tight text-slate-900">{paying.toLocaleString()}</span>{" "}
            <span className="text-sm text-slate-500">paying</span>
            {onTrial ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                <span className="sr-only"> · </span>
                {onTrial.toLocaleString()} on trial
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-3xl leading-none font-bold tracking-tight text-slate-900">
            {planCount} plan{planCount === 1 ? "" : "s"}
          </span>
        )}
      </p>
      {net !== null && (
        <p
          className={cn(
            "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
            net >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          )}
        >
          <Trend className="size-3.5" />
          MRR {net >= 0 ? "+" : "−"}
          {formatCompactVndAmount(Math.abs(net))}
          {pct !== null && ` · ${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`}
        </p>
      )}
    </button>
  );
}

/**
 * Every plan together: the AI's overall reading, MRR for all plans as a waterfall, and the plans side
 * by side in a table, each row opening that plan.
 */
export function AllPlansDetail({
  overall,
  bridge,
  snapshot,
  plans,
  previousScores,
  onPick,
}: {
  overall: string | null;
  bridge?: MrrBridgeDto;
  snapshot: PlanAiReviewSnapshot;
  plans: PlanAiAssessment[];
  previousScores: PlanAiScore[];
  onPick: (plan: string) => void;
}) {
  return (
    <Card id="ai-review-all" role="tabpanel" className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-none">
      {overall && (
        <div className="flex gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5">
          <span aria-hidden="true" className="w-1 shrink-0 rounded-full bg-[#2a9d8f]" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Across all plans</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-700">
              <Figures text={overall} />
            </p>
          </div>
        </div>
      )}

      <div className={cn("grid gap-8 px-6 py-6 max-md:grid-cols-[minmax(0,1fr)] max-md:px-4", bridge && "lg:grid-cols-2")}>
        {bridge && (
          <Section icon={LineChart} title="MRR this period, all plans">
            <MrrBridgeStrip
              bridge={bridge}
              periodStart={snapshot.periodStart}
              periodEnd={snapshot.periodEnd}
              className="rounded-xl border border-slate-200 p-4"
            />
          </Section>
        )}

        <Section icon={Table2} title="Plans side by side">
          <div className="overflow-hidden rounded-xl border border-slate-200 max-md:overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/70 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                  <th scope="col" className="px-4 py-2 font-semibold">Plan</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Health</th>
                  <th scope="col" className="px-2 py-2 font-semibold">Outlook</th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">Last review</th>
                  <th scope="col" className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => {
                  const Outlook = OUTLOOK_ICON[plan.outlook.direction];
                  const previous = previousScores.find((item) => item.plan === plan.plan);
                  return (
                    <tr
                      key={plan.plan}
                      onClick={() => onPick(plan.plan)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <th scope="row" className="px-4 py-3 text-left font-bold text-slate-900">
                        <button type="button" onClick={() => onPick(plan.plan)} className="hover:underline">
                          {planName(snapshot, plan.plan)}
                        </button>
                      </th>
                      <td className="px-2 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[plan.status].chip)}>
                          <span className="tabular-nums">{`${plan.score ?? "—"} · ${STATUS_LABEL[plan.status]}`}</span>
                        </span>
                      </td>
                      <td className="px-2 py-3 text-xs">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", OUTLOOK_CHIP[plan.outlook.direction])}>
                          <Outlook className="size-3.5" /> {OUTLOOK_LABEL[plan.outlook.direction]}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right text-xs text-slate-400 tabular-nums">
                        {previous ? `${STATUS_LABEL[previous.status]} · ${previous.score ?? "—"}` : "First review"}
                      </td>
                      <td className="pr-3 text-slate-300">
                        <ChevronRight className="size-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </Card>
  );
}
