import { AlertTriangle, BarChart3 } from "lucide-react";

import { Key, PairBars } from "@/components/admin/subscription-plans/leave-groups";
import { Section } from "@/components/admin/subscription-plans/plan-health-parts";
import { churnHeadline, coreUseLine, featureGaps, smallSampleNote } from "@/helpers/plan-churn-signals";
import type { PlanChurnSignal } from "@/types/plan-insights";
import { cn } from "@/utils/cn";

/**
 * Every feature the plan includes, used by the customers who stayed against those who left,
 * measured by the backend for the days Plan Insights shows, as a table with a pair of bars per
 * feature on one 0–100% scale. Small groups are shown with a warning (the AI review leaves them out).
 */
export function StayedVsLeft({ signal, days }: { signal: PlanChurnSignal; days?: number }) {
  const features = featureGaps(signal);
  const headline = churnHeadline(signal);
  const core = coreUseLine(signal);
  const small = smallSampleNote(signal);

  return (
    <Section icon={BarChart3} title="Stayed vs left">
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="px-4 pt-3">
          <p className="text-xs text-slate-500">
            {signal.stayed} customers stayed and {signal.left} stopped paying{days ? ` in the last ${days} days` : ""}. Each bar is
            the share of a group that used the feature at least once; a wide gap means the feature goes with staying.
          </p>
          {(headline || core) && (
            <p className="mt-2 text-sm text-slate-800">
              {headline} {core}
            </p>
          )}
          {small && (
            <p className="mt-2 flex gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {small}
            </p>
          )}
        </div>

        {features.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[620px] border-collapse text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                    <th scope="col" className="px-4 py-2 font-semibold">Feature</th>
                    <th scope="col" className="w-[34%] px-2 py-2 font-semibold">
                      <span className="sr-only">Comparison</span>
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">Stayed</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">Left</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {features.map((feature) => (
                    <tr key={feature.metric} className="hover:bg-slate-50/60">
                      <th scope="row" className="px-4 py-2.5 text-left font-normal text-slate-700">
                        {feature.label}
                      </th>
                      <td className="px-2 py-2.5">
                        <PairBars stayed={feature.stayedRate} left={feature.leftRate} leftFirst={false} />
                      </td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                        <span className="font-semibold text-slate-900">{feature.stayedRate}%</span>
                        <span className="block text-[11px] text-slate-400">
                          {feature.stayedUsers}/{signal.stayed}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                        <span className="font-semibold text-slate-900">{feature.leftRate}%</span>
                        <span className="block text-[11px] text-slate-400">
                          {feature.leftUsers}/{signal.left}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <GapChip gap={feature.gap} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex flex-wrap gap-4 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
              <Key color="#2a9d8f" label="Stayed" />
              <Key color="#e76e50" label="Left" />
              <span>Gap: percentage points those who stayed used it more.</span>
            </p>
          </>
        )}
      </div>
    </Section>
  );
}

// Darker for a wider gap; a feature those who left used more is shown in coral.
function GapChip({ gap }: { gap: number }) {
  const style =
    gap < 0
      ? "bg-[#e76e50]/12 text-[#c4553a]"
      : gap >= 25
        ? "bg-[#2a9d8f] text-white"
        : gap >= 10
          ? "bg-[#2a9d8f]/20 text-[#21796e]"
          : "bg-slate-100 text-slate-500";
  return (
    <span className={cn("rounded px-1.5 py-px text-[11px] font-semibold whitespace-nowrap tabular-nums", style)}>
      {gap > 0 ? "+" : ""}
      {gap} pts
    </span>
  );
}
