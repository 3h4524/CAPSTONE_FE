"use client";

import { useEffect, useState } from "react";
import { Layers, LineChart, ListChecks, Scale, UserMinus } from "lucide-react";

import { LeaveGroups } from "@/components/admin/subscription-plans/leave-groups";
import { MrrBridgeStrip } from "@/components/admin/subscription-plans/mrr-bridge-strip";
import {
  Figures,
  FindingList,
  KIND_STYLE,
  OUTLOOK_ICON,
  Pill,
  Section,
  STATUS_STYLE,
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
  STATUS_LABEL,
  strongestReasons,
} from "@/helpers/plan-ai-review";
import type { PlanAiAssessment, PlanAiReviewSnapshot } from "@/types/plan-ai-review";
import type { PlanChurnSignal, PlanVerdict } from "@/types/plan-insights";
import { cn } from "@/utils/cn";

type DetailTab = "overview" | "churn" | "features";

/**
 * The picked plan's AI review: the verdict up top, then one theme at a time, so the card never reads
 * as a wall: Overview (MRR, what to do, strengths and risks), Why customers leave (the groups, then
 * the AI's reading of them) and Features (stayed against left, then the AI's notes). The rule-based
 * check closes the card.
 */
export function PlanDetail({
  plan,
  snapshot,
  signal,
  verdict,
  days,
  focusFeature,
}: {
  plan: PlanAiAssessment;
  snapshot: PlanAiReviewSnapshot;
  signal?: PlanChurnSignal;
  verdict?: PlanVerdict;
  days?: number;
  // A feature to show, opened from elsewhere: switches to the Features tab.
  focusFeature?: string;
}) {
  const [tab, setTab] = useState<DetailTab>(focusFeature ? "features" : "overview");
  useEffect(() => {
    if (focusFeature) setTab("features");
  }, [focusFeature]);

  const Outlook = OUTLOOK_ICON[plan.outlook.direction];
  const reasons = strongestReasons(plan.churnReasons);
  const hasFindings = plan.strengths.length > 0 || plan.risks.length > 0;
  const bridge = snapshot.mrrBridges?.find((item) => item.planName === planName(snapshot, plan.plan));
  const tabs: { key: DetailTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "churn", label: "Why customers leave", count: (signal?.left ?? reasons.length) || undefined },
    { key: "features", label: "Features", count: plan.featureInsights.length || undefined },
  ];

  return (
    <Card id={`ai-review-${plan.plan}`} role="tabpanel" className="border-ink-200 bg-card gap-0 overflow-hidden rounded-2xl border p-0 shadow-none">
      {/* The verdict in a sentence, then the two reasons behind it, each led by what it explains. */}
      <div className="border-ink-100 bg-ink-50 border-b border-l-4 border-l-[#2a9d8f] px-6 py-5">
        <p className="text-ink-900 text-lg leading-relaxed font-semibold">
          <Figures text={plan.summary} className="text-ink-900 font-bold" />
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <Reason
            label={
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5", STATUS_STYLE[plan.status].chip)}>
                <span className="tabular-nums">{`${plan.score ?? "—"} · ${STATUS_LABEL[plan.status]}`}</span>
              </span>
            }
            text={plan.scoreReason}
          />
          <Reason
            label={
              <span className="bg-card text-ink-700 ring-ink-200 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ring-1">
                <Outlook className="size-3.5" /> {OUTLOOK_LABEL[plan.outlook.direction]}
              </span>
            }
            text={plan.outlook.reason}
          />
        </dl>
      </div>

      <div className="border-ink-100 flex gap-6 overflow-x-auto border-b px-6" aria-label="Plan detail sections">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-sm font-semibold transition-colors",
              tab === item.key ? "border-ink-900 text-ink-900" : "text-ink-400 hover:text-ink-700 border-transparent"
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] tabular-nums",
                  tab === item.key ? "bg-ink-900 text-card" : "bg-ink-100 text-ink-500"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-6 py-6">
        {tab === "overview" && (
          <div className="space-y-8">
            <div className={cn("grid gap-8 max-md:grid-cols-[minmax(0,1fr)]", bridge && "lg:grid-cols-2")}>
              {bridge && (
                <Section icon={LineChart} title="MRR this period">
                  <MrrBridgeStrip
                    bridge={bridge}
                    periodStart={snapshot.periodStart}
                    periodEnd={snapshot.periodEnd}
                    className="border-ink-200 rounded-xl border p-4"
                  />
                </Section>
              )}
              <Section icon={ListChecks} title="What to do">
                {plan.actions.length === 0 ? (
                  <p className="border-ink-200 text-ink-500 rounded-xl border border-dashed p-4 text-sm">Nothing to change now.</p>
                ) : (
                  <ol className="divide-ink-100 border-ink-200 divide-y rounded-xl border">
                    {sortActions(plan.actions).map((action) => (
                      <li key={action.text} className="flex items-start gap-3 px-4 py-3 text-sm">
                        <span className="w-16 shrink-0">
                          <Pill level={action.priority} />
                        </span>
                        <div className="min-w-0">
                          <span className="text-ink-400 block text-[11px] font-semibold tracking-wide uppercase">
                            {ACTION_KIND_LABEL[action.kind]}
                          </span>
                          <span className="text-ink-800 font-medium">
                            <Figures text={action.text} />
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>
            </div>
            {hasFindings && (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <FindingList title="Strengths" tone="bg-[#2a9d8f]" items={plan.strengths.map((item) => item.text)} />
                <FindingList title="Risks" tone="bg-[#e76e50]" items={plan.risks.map((item) => item.text)} />
              </div>
            )}
          </div>
        )}

        {tab === "churn" && (
          <div className="space-y-6">
            {signal && <LeaveGroups signal={signal} />}
            <Section icon={UserMinus} title="What the AI reads in it">
              {reasons.length === 0 ? (
                <p className="text-ink-500 text-sm">{plan.churnNote ?? "No clear pattern in the figures."}</p>
              ) : (
                <ol className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {reasons.map((reason) => (
                    <li key={reason.pattern} className="border-ink-200 rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-ink-900 text-sm font-semibold">{reason.pattern}</p>
                        <Pill level={reason.confidence} />
                      </div>
                      <p className="text-ink-600 mt-1 text-sm">
                        <Figures text={reason.evidence} />
                      </p>
                      {reason.hypothesis && (
                        <div className="border-ink-200 text-ink-500 mt-3 space-y-1 border-l-2 pl-3 text-xs">
                          <p>
                            <span className="text-ink-600 font-semibold">Possible explanation, unconfirmed: </span>
                            {reason.hypothesis}
                          </p>
                          {reason.howToConfirm && (
                            <p>
                              <span className="text-ink-600 font-semibold">To confirm: </span>
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
          </div>
        )}

        {tab === "features" && (
          <div className="space-y-6">
            {signal && <StayedVsLeft signal={signal} days={days} />}
            {plan.featureInsights.length > 0 && (
              <Section icon={Layers} title="What the AI reads in them">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {/* An odd last note spans both columns, leaving no hole. */}
                  {plan.featureInsights.map((insight, index, all) => (
                    <li
                      key={insight.feature}
                      id={`ai-feature-${plan.plan}-${insight.feature}`}
                      className={cn(
                        "border-ink-200 flex scroll-mt-24 flex-col rounded-xl border p-4 text-sm",
                        all.length % 2 === 1 && index === all.length - 1 && "sm:col-span-2"
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-ink-900 font-semibold">{featureName(snapshot, plan.plan, insight.feature)}</span>
                        {insight.kinds.map((kind) => (
                          <span key={kind} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", KIND_STYLE[kind])}>
                            {FEATURE_KIND_LABEL[kind]}
                          </span>
                        ))}
                      </div>
                      <p className="text-ink-600 mt-1">
                        <Figures text={insight.text} />
                      </p>
                      <p className="mt-auto pt-2 text-xs text-[#3f5f8a] dark:text-[#9db4d2]">→ {insight.suggestion}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {!signal && plan.featureInsights.length === 0 && <p className="text-ink-500 text-sm">No feature figures for this plan.</p>}
          </div>
        )}
      </div>

      {verdict && (
        <div className="border-ink-100 bg-ink-50/60 text-ink-500 flex gap-2 border-t px-6 py-3 text-xs">
          <Scale className="text-ink-400 mt-0.5 size-3.5 shrink-0" />
          <p>
            <span className="text-ink-600 font-semibold">Rule-based check ({verdict.verdictLabel}): </span>
            <Figures text={verdict.evidence.join(" ")} className="text-ink-700 font-semibold" />
            {verdict.action && <> Next step: {verdict.action}</>}
          </p>
        </div>
      )}
    </Card>
  );
}

// One reason on a line, its chip in a fixed column so the sentences start level.
function Reason({ label, text }: { label: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
      <dt className="shrink-0 text-xs font-semibold sm:w-32">{label}</dt>
      <dd className="text-ink-700 leading-relaxed">
        <Figures text={text} />
      </dd>
    </div>
  );
}
