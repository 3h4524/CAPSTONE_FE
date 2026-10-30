import { Layers, ListChecks, Scale, UserMinus } from "lucide-react";

import { LeaveGroups } from "@/components/admin/subscription-plans/leave-groups";
import { MrrBridgeStrip } from "@/components/admin/subscription-plans/mrr-bridge-strip";
import {
  FindingList,
  KIND_STYLE,
  Pill,
  Section,
} from "@/components/admin/subscription-plans/plan-health-parts";
import { StayedVsLeft } from "@/components/admin/subscription-plans/stayed-vs-left";
import { Card } from "@/components/ui/card";
import {
  ACTION_KIND_LABEL,
  FEATURE_KIND_LABEL,
  featureName,
  OUTLOOK_LABEL,
  planName,
  sortActions,
  strongestReasons,
} from "@/helpers/plan-ai-review";
import type { PlanAiAssessment, PlanAiReviewSnapshot } from "@/types/plan-ai-review";
import type { PlanChurnSignal, PlanVerdict } from "@/types/plan-insights";
import { cn } from "@/utils/cn";

/**
 * The picked plan's AI review in full: summary, why customers leave next to what to do, who stayed
 * and who left, features, strengths and risks, and the rule-based check.
 */
export function PlanDetail({
  plan,
  snapshot,
  signal,
  verdict,
  days,
}: {
  plan: PlanAiAssessment;
  snapshot: PlanAiReviewSnapshot;
  signal?: PlanChurnSignal;
  verdict?: PlanVerdict;
  days?: number;
}) {
  const reasons = strongestReasons(plan.churnReasons);
  const hasFindings = plan.strengths.length > 0 || plan.risks.length > 0;
  const bridge = snapshot.mrrBridges?.find((item) => item.planName === planName(snapshot, plan.plan));

  return (
    <Card id={`ai-review-${plan.plan}`} role="tabpanel" className="gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-none">
      {/* The verdict in a sentence, and the two reasons behind it. */}
      <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
        <p className="text-[15px] leading-relaxed font-medium text-slate-900">{plan.summary}</p>
        <dl className="mt-3 grid gap-x-8 gap-y-2 text-xs text-slate-600 md:grid-cols-2">
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-slate-500">Score</dt>
            <dd>{plan.scoreReason}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-slate-500">{OUTLOOK_LABEL[plan.outlook.direction]}</dt>
            <dd>{plan.outlook.reason}</dd>
          </div>
        </dl>
        {bridge && (
          <MrrBridgeStrip
            bridge={bridge}
            periodStart={snapshot.periodStart}
            periodEnd={snapshot.periodEnd}
            className="mt-3 border-t border-slate-200/70 pt-3"
          />
        )}
      </div>

      <div className="space-y-8 px-6 py-6">
        {/* The problem next to what to do about it. */}
        <div className="grid gap-6 lg:grid-cols-5">
          <Section icon={UserMinus} title="Why customers leave" className="lg:col-span-3">
            {/* The backend's groups first, then what the AI reads in them. */}
            {signal && <LeaveGroups signal={signal} />}
            {reasons.length === 0 ? (
              <p className={cn("text-sm text-slate-500", signal && "mt-3")}>{plan.churnNote ?? "No clear pattern in the figures."}</p>
            ) : (
              <ol className={cn("space-y-3", signal && "mt-3")}>
                {reasons.map((reason) => (
                  <li key={reason.pattern} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{reason.pattern}</p>
                      <Pill level={reason.confidence} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{reason.evidence}</p>
                    {reason.hypothesis && (
                      <div className="mt-3 space-y-1 border-l-2 border-slate-200 pl-3 text-xs text-slate-500">
                        <p>
                          <span className="font-semibold text-slate-600">Possible explanation, unconfirmed: </span>
                          {reason.hypothesis}
                        </p>
                        {reason.howToConfirm && (
                          <p>
                            <span className="font-semibold text-slate-600">To confirm: </span>
                            {reason.howToConfirm}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section icon={ListChecks} title="What to do" className="lg:col-span-2">
            {plan.actions.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing to change now.</p>
            ) : (
              <ol className="space-y-2.5 rounded-xl bg-slate-50 p-4">
                {sortActions(plan.actions).map((action) => (
                  <li key={action.text} className="text-sm text-slate-700">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Pill level={action.priority} />
                      <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        {ACTION_KIND_LABEL[action.kind]}:{" "}
                      </span>
                    </div>
                    {action.text}
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        {signal && <StayedVsLeft signal={signal} days={days} />}

        {/* Features in two columns on the left; strengths and risks stacked on the right, so both sides
            fill about the same height. An odd last feature spans both columns, leaving no hole. */}
        {(plan.featureInsights.length > 0 || hasFindings) && (
          <div className="grid gap-6 lg:grid-cols-3">
            {plan.featureInsights.length > 0 && (
              <Section icon={Layers} title="Features" className={hasFindings ? "lg:col-span-2" : "lg:col-span-3"}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {plan.featureInsights.map((insight, index, all) => (
                    <li
                      key={insight.feature}
                      id={`ai-feature-${plan.plan}-${insight.feature}`}
                      className={cn(
                        "scroll-mt-24",
                        "flex flex-col rounded-xl border border-slate-200 p-4 text-sm",
                        all.length % 2 === 1 && index === all.length - 1 && "sm:col-span-2"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{featureName(snapshot, plan.plan, insight.feature)}</span>
                        {insight.kinds.map((kind) => (
                          <span key={kind} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", KIND_STYLE[kind])}>
                            {FEATURE_KIND_LABEL[kind]}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-slate-600">{insight.text}</p>
                      <p className="mt-auto pt-1.5 text-xs text-[#3f5f8a]">→ {insight.suggestion}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {hasFindings && (
              <div className={cn("space-y-6", plan.featureInsights.length > 0 ? "" : "lg:col-span-3 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0")}>
                <FindingList title="Strengths" tone="bg-[#2a9d8f]" items={plan.strengths.map((item) => item.text)} />
                <FindingList title="Risks" tone="bg-[#e76e50]" items={plan.risks.map((item) => item.text)} />
              </div>
            )}
          </div>
        )}
      </div>

      {verdict && (
        <div className="flex gap-2 border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
          <Scale className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
          <p>
            <span className="font-semibold text-slate-600">Rule-based check ({verdict.verdictLabel}): </span>
            {verdict.evidence.join(" ")}
            {verdict.action && <> Next step: {verdict.action}</>}
          </p>
        </div>
      )}
    </Card>
  );
}
