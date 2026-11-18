import { AlertTriangle, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
  const features = featureGaps(signal);
  const headline = churnHeadline(signal);
  const core = coreUseLine(signal);
  const small = smallSampleNote(signal);

  return (
    <Section icon={BarChart3} title={t("admin.plans.stayedLeft.title")}>
      <div className="border-ink-200 overflow-hidden rounded-xl border">
        <div className="px-4 pt-3">
          <p className="text-ink-500 text-xs">
            {days
              ? t("admin.plans.stayedLeft.introWithDays", { stayed: signal.stayed, left: signal.left, days })
              : t("admin.plans.stayedLeft.intro", { stayed: signal.stayed, left: signal.left })}
          </p>
          {(headline || core) && (
            <p className="text-ink-800 mt-2 text-sm">
              {headline} {core}
            </p>
          )}
          {small && (
            <p className="mt-2 flex gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-300">
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
                  <tr className="border-ink-100 bg-ink-50/70 text-ink-500 border-y text-left text-[11px] tracking-wide uppercase">
                    <th scope="col" className="px-4 py-2 font-semibold">{t("admin.plans.shared.feature")}</th>
                    <th scope="col" className="w-[34%] px-2 py-2 font-semibold">
                      <span className="sr-only">{t("admin.plans.shared.comparison")}</span>
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">{t("admin.plans.shared.stayed")}</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">{t("admin.plans.shared.left")}</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">{t("admin.plans.stayedLeft.gap")}</th>
                  </tr>
                </thead>
                <tbody className="divide-ink-100 divide-y">
                  {features.map((feature) => (
                    <tr key={feature.metric} className="hover:bg-ink-50/60">
                      <th scope="row" className="text-ink-700 px-4 py-2.5 text-left font-normal">
                        {feature.label}
                      </th>
                      <td className="px-2 py-2.5">
                        <PairBars stayed={feature.stayedRate} left={feature.leftRate} leftFirst={false} />
                      </td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                        <span className="text-ink-900 font-semibold">{feature.stayedRate}%</span>
                        <span className="text-ink-400 block text-[11px]">
                          {feature.stayedUsers}/{signal.stayed}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                        <span className="text-ink-900 font-semibold">{feature.leftRate}%</span>
                        <span className="text-ink-400 block text-[11px]">
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
            <p className="border-ink-100 text-ink-500 flex flex-wrap gap-4 border-t px-4 py-2 text-[11px]">
              <Key color="#2a9d8f" label={t("admin.plans.shared.stayed")} />
              <Key color="#e76e50" label={t("admin.plans.shared.left")} />
              <span>{t("admin.plans.stayedLeft.gapLegend")}</span>
            </p>
          </>
        )}
      </div>
    </Section>
  );
}

// Darker for a wider gap; a feature those who left used more is shown in coral.
function GapChip({ gap }: { gap: number }) {
  const { t } = useTranslation("common");
  const style =
    gap < 0
      ? "bg-[#e76e50]/12 text-[#c4553a] dark:text-[#dea091]"
      : gap >= 25
        ? "bg-[#2a9d8f] text-white"
        : gap >= 10
          ? "bg-[#2a9d8f]/20 text-[#21796e] dark:text-[#8fe0d6]"
          : "bg-ink-100 text-ink-500";
  return (
    <span className={cn("rounded px-1.5 py-px text-[11px] font-semibold whitespace-nowrap tabular-nums", style)}>
      {gap > 0 ? "+" : ""}
      {gap} {t("admin.plans.shared.pts")}
    </span>
  );
}
