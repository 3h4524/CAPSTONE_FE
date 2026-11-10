import { AlertTriangle, Info } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import type { PlanFeatureImpact } from "@/types/admin-subscription-plan";
import { cn } from "@/utils/cn";

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;

// Who a change to a plan feature reaches, shown before the Admin confirms it.
export function FeatureImpactNote({
  impact,
  isLoading,
  planName,
}: {
  impact: PlanFeatureImpact | undefined;
  isLoading: boolean;
  planName: string;
}) {
  if (isLoading || !impact) {
    return (
      <div className="bg-ink-50 text-ink-500 flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
        <Spinner className="size-4" /> Checking who this reaches…
      </div>
    );
  }

  const onPlan = `${plural(impact.subscribers, "paying subscriber")}${impact.trials > 0 ? ` and ${plural(impact.trials, "trial")}` : ""} on ${planName}`;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl px-4 py-3 text-sm",
        impact.isReduction ? "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-300" : "bg-ink-50 text-ink-600"
      )}
    >
      {impact.isReduction ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      ) : (
        <Info className="text-ink-400 mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <ul className="space-y-1">
        {impact.isReduction ? (
          <>
            <li>New subscribers get the new setting at once.</li>
            {impact.givenRecently ? (
              <li>It was given less than a day ago, so nobody keeps it: this undoes a recent change.</li>
            ) : impact.keptBy === 0 ? (
              <li>Nobody on {planName} has a period left to keep the old setting for.</li>
            ) : (
              <>
                {impact.paidForBy > 0 && (
                  <li>
                    {plural(impact.paidForBy, "subscriber")} paid for it and keep it until their period ends (latest{" "}
                    {formatDate(impact.paidForUntil!)}).
                  </li>
                )}
                {impact.noticeBy > 0 && (
                  <li>
                    {plural(impact.noticeBy, "subscriber")} got it after their period began and keep it for{" "}
                    {impact.noticeDays} days (until {formatDate(impact.noticeUntil!)} at the latest).
                  </li>
                )}
              </>
            )}
          </>
        ) : (
          <li>Applies at once to the {onPlan}.</li>
        )}
        {impact.isReduction && <li className="text-xs opacity-80">Now: {onPlan}.</li>}
        {impact.usedRecently !== null && (
          <li className="text-xs opacity-80">
            {impact.usedRecently.toLocaleString()} of them used it in the last {impact.usageDays} days.
          </li>
        )}
      </ul>
    </div>
  );
}
