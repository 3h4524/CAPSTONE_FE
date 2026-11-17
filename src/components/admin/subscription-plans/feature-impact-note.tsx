import { AlertTriangle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Spinner } from "@/components/ui/spinner";
import type { PlanFeatureImpact } from "@/types/admin-subscription-plan";
import { cn } from "@/utils/cn";

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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
  const { t } = useTranslation("common");

  if (isLoading || !impact) {
    return (
      <div className="bg-ink-50 text-ink-500 flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
        <Spinner className="size-4" /> {t("admin.plans.impact.checkingWhoThisReaches")}
      </div>
    );
  }

  const subscribers = t("admin.plans.impact.payingSubscribers", { count: impact.subscribers, formatted: impact.subscribers.toLocaleString() });
  const trials = t("admin.plans.impact.trials", { count: impact.trials, formatted: impact.trials.toLocaleString() });
  const onPlan =
    impact.trials > 0
      ? t("admin.plans.impact.onPlanWithTrials", { subscribers, trials, plan: planName })
      : t("admin.plans.impact.onPlan", { subscribers, plan: planName });

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
            <li>{t("admin.plans.impact.newSubscribersAtOnce")}</li>
            {impact.givenRecently ? (
              <li>{t("admin.plans.impact.undoneRecentChange")}</li>
            ) : impact.keptBy === 0 ? (
              <li>{t("admin.plans.impact.nobodyHasPeriod", { plan: planName })}</li>
            ) : (
              <>
                {impact.paidForBy > 0 && (
                  <li>
                    {t("admin.plans.impact.paidFor", { count: impact.paidForBy, formatted: impact.paidForBy.toLocaleString(), date: formatDate(impact.paidForUntil!) })}
                  </li>
                )}
                {impact.noticeBy > 0 && (
                  <li>
                    {t("admin.plans.impact.noticeBy", { count: impact.noticeBy, formatted: impact.noticeBy.toLocaleString(), days: impact.noticeDays, date: formatDate(impact.noticeUntil!) })}
                  </li>
                )}
              </>
            )}
          </>
        ) : (
          <li>{t("admin.plans.impact.appliesAtOnce", { scope: onPlan })}</li>
        )}
        {impact.isReduction && <li className="text-xs opacity-80">{t("admin.plans.impact.nowScope", { scope: onPlan })}</li>}
        {impact.usedRecently !== null && (
          <li className="text-xs opacity-80">
            {t("admin.plans.impact.usedRecently", { used: impact.usedRecently.toLocaleString(), days: impact.usageDays })}
          </li>
        )}
      </ul>
    </div>
  );
}
