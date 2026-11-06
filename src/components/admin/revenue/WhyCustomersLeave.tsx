"use client";

import Link from "next/link";
import { Sparkles, UserMinus } from "lucide-react";

import { churnInsightsFor, type PlanChurnInsight } from "@/helpers/plan-ai-review";
import type { PlanAiReviewResponse } from "@/types/plan-ai-review";

const CONFIDENCE_STYLE = {
  high: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
  medium: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  low: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
} as const;

interface WhyCustomersLeaveProps {
  /** The plan the MRR movement shows; null for all plans. */
  planName: string | null;
  aiReview?: PlanAiReviewResponse;
}

/**
 * Under the MRR movement: the AI review's reading of why each plan's customers leave. It is an
 * insight over the review's own recent days (the same as Plan Insights), not a breakdown of the
 * days selected above, so it says which days it covers.
 */
export function WhyCustomersLeave({ planName, aiReview }: WhyCustomersLeaveProps) {
  const insights = churnInsightsFor(aiReview, planName);
  if (!insights) return null;
  const focus = planName ? insights.plans[0]?.planKey : undefined;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
            <UserMinus className="size-3.5 text-rose-500" /> Why customers leave
          </h4>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Sparkles className="size-3 text-[#5b7aa6]" /> AI review of {insights.period}, whatever period is selected above.
            Links, not proven causes.
          </p>
        </div>
        <Link
          href={`/admin/subscription-plans?view=insights${focus ? `&plan=${focus}` : ""}`}
          className="text-xs font-semibold text-[#3f5f8a] hover:underline dark:text-slate-200"
        >
          See details in Plan Insights →
        </Link>
      </div>

      <div className={`mt-3 grid gap-3 ${insights.plans.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
        {insights.plans.map((plan) => (
          <PlanColumn key={plan.planKey} plan={plan} showName={planName === null} reasons={planName === null ? 1 : 2} />
        ))}
      </div>
    </div>
  );
}

function PlanColumn({ plan, showName, reasons }: { plan: PlanChurnInsight; showName: boolean; reasons: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-white p-3 text-xs leading-relaxed dark:bg-slate-900">
      {showName && <p className="font-semibold text-slate-900 dark:text-slate-100">{plan.planName}</p>}
      {plan.reasons.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">{plan.note}</p>
      ) : (
        // All plans: the strongest reason of each; one plan: its two strongest.
        plan.reasons.slice(0, reasons).map((reason) => (
          <div key={reason.pattern} className="flex gap-2">
            <span className={`mt-0.5 h-fit shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase ${CONFIDENCE_STYLE[reason.confidence]}`}>
              {reason.confidence}
            </span>
            <span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{reason.pattern}</span>{" "}
              <span className="text-slate-500 dark:text-slate-400">{reason.evidence}</span>
            </span>
          </div>
        ))
      )}
    </div>
  );
}
