
import { useTranslation } from "react-i18next";

import { leaveGroupDescription } from "@/helpers/plan-churn-signals";
import type { PlanChurnSignal } from "@/types/plan-insights";
import { cn } from "@/utils/cn";

// The same pair as Stayed vs left: teal for those who stayed, coral for those who left.
const STAYED = "#2a9d8f";
const LEFT = "#e76e50";

/**
 * What each customer who left did before leaving, one group each, against the customers who stayed,
 * as a table with a pair of bars per group on one 0–100% scale. The backend sorts them; a group
 * clearly more common among those who left is marked notable, and groups nobody who left falls in
 * are named together at the end.
 */
export function LeaveGroups({ signal }: { signal: PlanChurnSignal }) {
  const { t } = useTranslation("common");
  if (signal.left === 0 || signal.leaveGroups.length === 0) return null;
  const groups = signal.leaveGroups.filter((group) => group.left > 0);
  const empty = signal.leaveGroups.filter((group) => group.left === 0);

  return (
    <div aria-label={t("admin.plans.leaveGroups.aria")} className="border-ink-200 overflow-hidden rounded-xl border text-sm">
      <p className="text-ink-500 px-4 pt-3 text-xs">
        {t("admin.plans.leaveGroups.intro", { left: signal.left, stayed: signal.stayed })}
      </p>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-ink-100 bg-ink-50/70 text-ink-500 border-y text-left text-[11px] font-semibold tracking-wide uppercase">
              <th scope="col" className="px-4 py-2 font-semibold">{t("admin.plans.leaveGroups.beforeLeaving")}</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">{t("admin.plans.shared.left")}</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">{t("admin.plans.shared.stayed")}</th>
              <th scope="col" className="w-[28%] px-4 py-2 font-semibold">
                <span className="sr-only">{t("admin.plans.shared.comparison")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-ink-100 divide-y">
            {groups.map((group) => (
              <tr key={group.key} className="hover:bg-ink-50/60 align-top">
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <span className={cn("font-semibold", group.notable ? "text-ink-900" : "text-ink-700")}>{group.label}</span>
                  {group.notable && (
                    <span className="ml-1.5 rounded bg-[#e76e50]/12 px-1.5 py-px text-[10px] font-semibold text-[#c4553a] dark:text-[#dea091]">{t("admin.plans.leaveGroups.notable")}</span>
                  )}
                  <span className="text-ink-400 mt-0.5 block text-xs">{leaveGroupDescription(group, signal)}</span>
                </th>
                <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                  <span className="text-ink-900 font-semibold">{group.leftRate ?? 0}%</span>
                  <span className="text-ink-400 block text-[11px]">
                    {t("admin.plans.leaveGroups.ofTotal", { left: group.left, total: signal.left })}
                  </span>
                </td>
                <td className="text-ink-900 px-2 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums">
                  {group.stayedRate ?? 0}%
                </td>
                <td className="px-4 py-3">
                  <PairBars left={group.leftRate ?? 0} stayed={group.stayedRate ?? 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-ink-100 text-ink-500 flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2 text-[11px]">
        <span className="flex gap-4">
          <Key color={LEFT} label={t("admin.plans.shared.left")} />
          <Key color={STAYED} label={t("admin.plans.shared.stayed")} />
        </span>
        {empty.length > 0 && <span>{t("admin.plans.leaveGroups.nobodyFellIn", { list: empty.map((group) => group.label.toLowerCase()).join(", ") })}</span>}
      </div>
    </div>
  );
}

/** Two thin bars on one 0–100% scale: those who left above, those who stayed below. */
export function PairBars({ left, stayed, leftFirst = true }: { left: number; stayed: number; leftFirst?: boolean }) {
  const { t } = useTranslation("common");
  const bars = [
    { key: "left", value: left, color: LEFT, label: t("admin.plans.shared.leftPercent", { value: left }) },
    { key: "stayed", value: stayed, color: STAYED, label: t("admin.plans.shared.stayedPercent", { value: stayed }) },
  ];
  return (
    <div className="space-y-[3px]" role="img" aria-label={bars.map((bar) => bar.label).join(", ")}>
      {(leftFirst ? bars : bars.reverse()).map((bar) => (
        <div key={bar.key} title={bar.label} className="bg-ink-100 h-2 rounded-sm">
          <div
            className="h-full rounded-sm"
            style={{ width: `${Math.max(bar.value > 0 ? 2 : 0, Math.min(100, bar.value))}%`, backgroundColor: bar.color }}
          />
        </div>
      ))}
    </div>
  );
}

export function Key({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-sm" style={{ backgroundColor: color }} /> {label}
    </span>
  );
}
