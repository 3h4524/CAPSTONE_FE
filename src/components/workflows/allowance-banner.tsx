"use client";

import Link from "next/link";
import { Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";

import { allowanceLine, allowanceResetLine, orderAllowances, remaining } from "@/helpers/allowance";
import { SUBSCRIPTION_PATH } from "@/helpers/plan-errors";
import { useAllowances } from "@/hooks/queries/use-allowances";
import { cn } from "@/utils/cn";

// A slim line above the canvas for Sellers on Free or the Pro trial: what is left before they run.
export const AllowanceBanner = () => {
  const { data: allowances } = useAllowances();
  const { t, i18n } = useTranslation("common");
  if (!allowances || allowances.scope === null) return null;

  const items = orderAllowances(allowances);
  const reset = allowanceResetLine(allowances, i18n.language);

  return (
    <div
      aria-label={t("workflowEditor.allowance.label")}
      className="scrollbar-hide bg-ink-50 text-ink-600 flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-xs max-md:flex-nowrap max-md:overflow-x-auto max-md:whitespace-nowrap [@media(max-height:500px)]:hidden"
    >
      <span className="text-ink-800 flex items-center gap-1.5 font-semibold">
        <Gauge className="size-3.5" aria-hidden="true" />
        {allowances.scope === "trial" ? t("workflowEditor.allowance.freeTrial") : allowances.scope === "plan" ? t("workflowEditor.allowance.planThisMonth") : t("workflowEditor.allowance.free")}
      </span>
      {items.map((item) => (
        <span key={item.code} className={cn("tabular-nums", remaining(item) === 0 && "font-semibold text-rose-700 dark:text-rose-300")}>
          {allowanceLine(item)}
        </span>
      ))}
      {allowances.mockupsPerRun !== null && <span>{t("workflowEditor.allowance.mockupsPerRun", { count: allowances.mockupsPerRun })}</span>}
      {reset && <span className="text-ink-500">{reset}</span>}
      <Link href={SUBSCRIPTION_PATH} className="text-ink-800 ml-auto font-semibold underline underline-offset-2">
        {t("workflowEditor.allowance.viewPlans")}
      </Link>
    </div>
  );
};
