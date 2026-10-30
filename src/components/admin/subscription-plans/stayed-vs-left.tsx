import { AlertTriangle, BarChart3 } from "lucide-react";

import { Bar, Section } from "@/components/admin/subscription-plans/plan-health-parts";
import { churnHeadline, coreUseLine, featureGaps, smallSampleNote } from "@/helpers/plan-churn-signals";
import type { PlanChurnSignal } from "@/types/plan-insights";
import { cn } from "@/utils/cn";

/**
 * Every feature the plan includes, used by the customers who stayed against those who left,
 * measured by the backend for the days Plan Insights shows. Small groups are shown with a warning
 * (the AI review leaves them out).
 */
export function StayedVsLeft({ signal, days }: { signal: PlanChurnSignal; days?: number }) {
  const features = featureGaps(signal);
  const headline = churnHeadline(signal);
  const core = coreUseLine(signal);
  const small = smallSampleNote(signal);

  return (
    <Section icon={BarChart3} title="Stayed vs left">
      <div className="rounded-xl border border-slate-200 p-4">
        <p className="text-xs text-slate-500">
          {signal.stayed} customers stayed and {signal.left} stopped paying{days ? ` in the last ${days} days` : ""}. Each bar is the
          share of a group that used the feature at least once; a wide gap means the feature goes with staying.
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

        {features.length > 0 && (
          <>
            <ul className="mt-4 grid gap-x-8 gap-y-3 lg:grid-cols-2">
              {features.map((feature) => (
                <li key={feature.metric}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-slate-700">{feature.label}</span>
                    <span className="flex items-baseline gap-2 text-xs text-slate-500 tabular-nums">
                      <span>
                        <strong className="font-semibold text-[#21796e]">{feature.stayedRate}%</strong>
                        <span className="text-slate-400"> ({feature.stayedUsers}/{signal.stayed})</span> vs{" "}
                        <strong className="font-semibold text-[#c4553a]">{feature.leftRate}%</strong>
                        <span className="text-slate-400"> ({feature.leftUsers}/{signal.left})</span>
                      </span>
                      <GapChip gap={feature.gap} />
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    <Bar value={feature.stayedRate} color="bg-[#2a9d8f]" />
                    <Bar value={feature.leftRate} color="bg-[#e76e50]/70" />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[#2a9d8f]" /> Stayed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[#e76e50]/70" /> Left
              </span>
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
    <span className={cn("rounded px-1.5 py-px text-[10px] font-semibold", style)}>
      {gap > 0 ? "+" : ""}
      {gap} pts
    </span>
  );
}
