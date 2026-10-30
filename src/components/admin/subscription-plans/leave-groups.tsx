import { leaveGroupDescription } from "@/helpers/plan-churn-signals";
import type { PlanChurnSignal } from "@/types/plan-insights";
import { cn } from "@/utils/cn";

/**
 * What each customer who left did before leaving, one group each, against the customers who stayed,
 * as short lines of text. The backend sorts them; a group clearly more common among those who left
 * is marked notable, and groups nobody who left falls in are named together at the end.
 */
export function LeaveGroups({ signal }: { signal: PlanChurnSignal }) {
  if (signal.left === 0 || signal.leaveGroups.length === 0) return null;
  const groups = signal.leaveGroups.filter((group) => group.left > 0);
  const empty = signal.leaveGroups.filter((group) => group.left === 0);

  return (
    <div aria-label="Leave groups" className="rounded-xl border border-slate-200 p-4 text-sm">
      <p className="text-xs text-slate-500">
        What the {signal.left} customers who left did before leaving, one group each, against the {signal.stayed} who stayed.
      </p>
      <ul className="mt-2 space-y-1.5">
        {groups.map((group) => (
          <li key={group.key} className="leading-relaxed text-slate-600">
            <span className={cn("font-semibold", group.notable ? "text-slate-900" : "text-slate-700")}>{group.label}</span>
            {group.notable && (
              <span className="ml-1.5 rounded bg-[#e76e50]/12 px-1.5 py-px text-[10px] font-semibold text-[#c4553a]">Notable</span>
            )}
            {": "}
            <span className="tabular-nums">
              <strong className="font-semibold text-[#c4553a]">
                {group.left} of {signal.left} ({group.leftRate ?? 0}%)
              </strong>{" "}
              against <strong className="font-semibold text-[#21796e]">{group.stayedRate ?? 0}%</strong> of those who stayed.
            </span>{" "}
            <span className="text-slate-400">{leaveGroupDescription(group, signal)}</span>
          </li>
        ))}
      </ul>
      {empty.length > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          Nobody who left fell in: {empty.map((group) => group.label.toLowerCase()).join(", ")}.
        </p>
      )}
    </div>
  );
}
