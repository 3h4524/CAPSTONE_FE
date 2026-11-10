"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";

import { AllPlansDetail, AllPlansTile } from "@/components/admin/subscription-plans/all-plans-health";
import { PlanDetail } from "@/components/admin/subscription-plans/plan-health-detail";
import { PlanTile } from "@/components/admin/subscription-plans/plan-health-tile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDay, formatPeriod, planName, regenerateBlocker } from "@/helpers/plan-ai-review";
import { useRegeneratePlanAiReview } from "@/hooks/mutations/use-regenerate-plan-ai-review";
import { usePlanAiReview } from "@/hooks/queries/use-plan-ai-review";
import type { PlanAiAssessment, PlanAiReviewResponse } from "@/types/plan-ai-review";
import type { PlanInsights } from "@/types/plan-insights";

// The pick that shows every plan together.
const ALL = "__all__";

interface PlanAiReviewSectionProps {
  /** A plan key to open first, when the page is opened from the Revenue page. */
  focusPlan?: string | null;
  /** Plan Insights for the same days: who stayed and who left, and the rule-based checks. */
  insights?: PlanInsights;
  /** A feature picked in the adoption table: open a plan that comments on it and scroll to the comment. */
  focusFeature?: { metric: string; nonce: number } | null;
}

/**
 * Plan health, from the verdict to the evidence: a tile per paid plan to pick from, then the
 * picked plan's summary, why its customers leave next to what to do about it, how those who stayed
 * and left used APCS, its features, and its strengths and risks.
 */
export function PlanAiReviewSection({ focusPlan, focusFeature, insights }: PlanAiReviewSectionProps) {
  const { data, isLoading, isError, refetch } = usePlanAiReview();
  const regenerate = useRegeneratePlanAiReview();
  const [picked, setPicked] = useState<string | null>(focusPlan ?? null);

  // Opened from the Revenue page for one plan: bring the section into view once it is there.
  const hasReview = Boolean(data?.latest);
  useEffect(() => {
    if (focusPlan && hasReview) document.getElementById("plan-health")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusPlan, hasReview]);

  // The picked plan if it comments on the feature, otherwise the first plan that does.
  const reviewPlans = data?.latest?.review.plans;
  useEffect(() => {
    if (!focusFeature || !reviewPlans) return;
    const comments = (plan: PlanAiAssessment) => plan.featureInsights.some((insight) => insight.feature === focusFeature.metric);
    const target = reviewPlans.find((plan) => plan.plan === picked && comments(plan)) ?? reviewPlans.find(comments);
    if (!target) return;
    setPicked(target.plan);
    // After the plan's detail renders.
    window.setTimeout(
      () => document.getElementById(`ai-feature-${target.plan}-${focusFeature.metric}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
      60
    );
    // Only a new pick moves the page, not a change of plan by hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusFeature, reviewPlans]);

  if (isLoading) {
    return (
      <section id="plan-health" className="scroll-mt-32 space-y-4" aria-labelledby="ai-review-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#2a9d8f]/12 text-[#21796e] dark:text-[#8fe0d6]">
              <Activity className="size-[18px]" />
            </div>
            <div>
              <h2 id="ai-review-title" className="text-ink-900 flex items-center gap-1.5 text-lg font-semibold tracking-tight">
                Plan health
              </h2>
              <p className="text-ink-400 text-xs">Loading AI review...</p>
            </div>
          </div>
        </div>
        <Card className="border-ink-200 bg-card flex h-56 flex-col items-center justify-center rounded-2xl border p-6">
          <Loader2 className="text-ink-400 size-6 animate-spin" />
          <p className="text-ink-400 mt-2 text-xs">Analyzing plan performance and subscriber health metrics...</p>
        </Card>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section id="plan-health" className="scroll-mt-32 space-y-4" aria-labelledby="ai-review-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#2a9d8f]/12 text-[#21796e] dark:text-[#8fe0d6]">
              <Activity className="size-[18px]" />
            </div>
            <div>
              <h2 id="ai-review-title" className="text-ink-900 flex items-center gap-1.5 text-lg font-semibold tracking-tight">
                Plan health
              </h2>
              <p className="text-ink-500 text-xs">AI analysis unavailable</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-md px-3 text-xs max-md:hidden"
            onClick={() => refetch?.()}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Retry
          </Button>
        </div>

        <div className="border-ink-300 bg-card rounded-xl border border-dashed px-6 py-8 text-center max-md:p-4">
          <AlertTriangle className="mx-auto size-7 text-amber-500" />
          <p className="text-ink-800 mt-2 text-sm font-semibold">AI Plan Review is currently unavailable</p>
          <p className="text-ink-500 mx-auto mt-1 max-w-md text-xs">
            Unable to connect to the AI review service or the server returned an error. The rule-based checks below still apply.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => refetch?.()}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Try again
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const blocker = regenerateBlocker(data, new Date());
  const snapshot = data.latest;
  const plans = snapshot?.review.plans ?? [];
  const allPlansBridge = snapshot?.mrrBridges?.find((bridge) => bridge.planName === null);
  const hasAllPlans = Boolean(snapshot?.review.overall || allPlansBridge);
  // Nothing picked opens every plan together, when there is anything to show for it.
  const showAll = hasAllPlans && (picked === ALL || picked === null);
  const selected = plans.find((plan) => plan.plan === picked) ?? plans[0];

  return (
    <section id="plan-health" className="scroll-mt-32 space-y-4" aria-labelledby="ai-review-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#2a9d8f]/12 text-[#21796e] dark:text-[#8fe0d6]">
            <Activity className="size-[18px]" />
          </div>
          <div>
            <h2 id="ai-review-title" className="text-ink-900 flex items-center gap-1.5 text-lg font-semibold tracking-tight">
              Plan health
              {/* A plain title tooltip: the caveat stays one hover away instead of a third line. */}
              <span
                className="text-ink-400 cursor-help"
                title="Written by AI. Every figure it quotes is checked against the data. It shows what goes together, not proven causes."
              >
                <Info className="size-3.5" aria-label="About this review" />
              </span>
            </h2>
            {snapshot && (
              <p className="text-ink-500 text-xs" title={snapshot.model ?? undefined}>
                AI review of {formatPeriod(snapshot.periodStart, snapshot.periodEnd)} · Generated {formatDay(snapshot.generatedAt)}
                {data.nextRefreshAt && <> · Next refresh {formatDay(data.nextRefreshAt)}</>}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-md px-3 text-xs"
            disabled={blocker !== null || regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            {data.isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {data.isGenerating ? "Generating…" : "Regenerate"}
          </Button>
          {blocker && !data.isGenerating && <span className="text-ink-400 text-[11px]">{blocker}</span>}
        </div>
      </div>

      <StatusNotes data={data} />

      {snapshot && selected ? (
        <>
          {/* Every plan together is picked like a plan, first in the row, instead of a card of its own. */}
          <div role="tablist" aria-label="Plan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {hasAllPlans && (
              <AllPlansTile
                planCount={plans.length}
                paying={insights?.plans.filter((plan) => !plan.isTrial).reduce((sum, plan) => sum + plan.subscribers, 0)}
                onTrial={insights?.plans.find((plan) => plan.isTrial)?.subscribers}
                bridge={allPlansBridge}
                selected={showAll}
                onSelect={() => setPicked(ALL)}
              />
            )}
            {plans.map((plan) => (
              <PlanTile
                key={plan.plan}
                plan={plan}
                name={planName(snapshot, plan.plan)}
                previous={data.previousScores.find((item) => item.plan === plan.plan)}
                selected={!showAll && plan.plan === selected.plan}
                onSelect={() => setPicked(plan.plan)}
              />
            ))}
          </div>

          {showAll ? (
            <AllPlansDetail
              overall={snapshot.review.overall || null}
              bridge={allPlansBridge}
              snapshot={snapshot}
              plans={plans}
              previousScores={data.previousScores}
              onPick={setPicked}
            />
          ) : (
          <PlanDetail
            plan={selected}
            snapshot={snapshot}
            signal={insights?.churnSignals?.find((item) => item.key === selected.plan)}
            verdict={insights?.verdicts.find((item) => item.key === selected.plan)}
            days={insights?.days}
            focusFeature={focusFeature?.metric}
          />
          )}
        </>
      ) : (
        !data.isGenerating && (
          <p className="border-ink-300 bg-card text-ink-500 rounded-xl border border-dashed px-4 py-6 text-center text-sm">
            No AI review yet. {data.isConfigured ? "Press Regenerate to write the first one, or wait for the scheduled one." : ""}
            {" "}The rule-based checks below still apply.
          </p>
        )
      )}
    </section>
  );
}

function StatusNotes({ data }: { data: PlanAiReviewResponse }) {
  return (
    <>
      {/* Slim one-line notes, so they inform without pushing the review down. */}
      {data.isGenerating && (
        <p className="flex items-center gap-2 rounded-lg border border-[#5b7aa6]/20 bg-[#5b7aa6]/5 px-3 py-1.5 text-xs text-[#3f5f8a] dark:text-[#9db4d2]">
          <Loader2 className="size-3.5 shrink-0 animate-spin" /> Writing a new review. It takes a few minutes; this page updates when it is done.
        </p>
      )}
      {!data.isConfigured && (
        <p className="border-ink-200 bg-ink-50 text-ink-600 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs">
          <Info className="size-3.5 shrink-0" /> AI reviews are off: no Gemini key is set on the server.
        </p>
      )}
      {data.lastFailedAt && !data.isGenerating && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          The last attempt on {formatDay(data.lastFailedAt)} did not pass the checks
          {data.latest ? ", so this is the previous review." : "."} It will be tried again automatically.
        </p>
      )}
    </>
  );
}
