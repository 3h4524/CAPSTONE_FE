"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { FeatureAdoptionCard } from "@/components/admin/subscription-plans/feature-adoption-card";
import { PlanAiReviewSection } from "@/components/admin/subscription-plans/plan-ai-review-section";
import { Card } from "@/components/ui/card";
import { formatShare, splitAiLabel } from "@/helpers/plan-adoption";
import { usePlanAiReview } from "@/hooks/queries/use-plan-ai-review";
import { usePlanInsights } from "@/hooks/queries/use-plan-insights";
import type { PlanInsights, PlanVerdict } from "@/types/plan-insights";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";

// One calm steel blue carries the data; teal (--chart-2) marks what goes well, coral
// (--chart-1) what goes badly and amber what needs a look.
const BAR = "bg-[#5b7aa6]";
const BAR_LIGHT = "bg-[#5b7aa6]/35";
const TEAL = "bg-[#2a9d8f]";
const CORAL = "bg-[#e76e50]";

// Prices and costs arrive in VND at the PayOS rate. A unit cost can be a few đồng, so amounts under
// 100 ₫ keep two decimals instead of reading as zero.
const formatCostVnd = (value: number) =>
  value !== 0 && Math.abs(value) < 100
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(value)
    : formatVnd(value);

const formatRate = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

/**
 * Plan Insights, from the whole picture to the detail: the headline figures, each plan's health
 * (the AI review with who stayed and who left), feature use, trials, and where Sellers get stuck.
 * @param focusPlan A plan key to open in Plan health, when opened from the Revenue page.
 */
export function PlanInsightsPanel({ focusPlan }: { focusPlan?: string | null }) {
  const { data, isLoading } = usePlanInsights();
  const { data: aiReview } = usePlanAiReview();
  // A feature picked in the adoption table, to open in the AI review; the nonce repeats a pick.
  const [focusFeature, setFocusFeature] = useState<{ metric: string; nonce: number } | null>(null);
  const reviewedFeatures = new Set(
    (aiReview?.latest?.review.plans ?? []).flatMap((plan) => plan.featureInsights.map((insight) => insight.feature))
  );

  return (
    <div className="mt-6 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-slate-600">
          How Sellers on each plan use APCS, what they cost and how trials convert.
        </p>
        <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600">
          Last {data?.days ?? 45} days
        </span>
      </div>

      {isLoading || !data ? <LoadingState /> : <KpiStrip data={data} />}

      {/* The AI review covers the same 45 days, as of the day it was written. */}
      <PlanAiReviewSection focusPlan={focusPlan} focusFeature={focusFeature} insights={data} />

      {/* Without an AI review the rule-based checks stand on their own; with one they sit in each plan's detail. */}
      {data && !aiReview?.latest && data.verdicts.length > 0 && <VerdictCards data={data} />}

      {data && (
        <InsightsContent
          data={data}
          reviewedFeatures={reviewedFeatures}
          onFeatureSelect={(metric) => setFocusFeature({ metric, nonce: Date.now() })}
        />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Card className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <Card className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}

function InsightsContent({
  data,
  reviewedFeatures,
  onFeatureSelect,
}: {
  data: PlanInsights;
  reviewedFeatures: ReadonlySet<string>;
  onFeatureSelect: (metric: string) => void;
}) {
  // Running trials have their own card; the plan comparisons only show the plans people pay for.
  const paidPlans = data.plans.filter((plan) => !plan.isTrial);

  return (
    <>
      <Group label="Feature use">
        <FeatureAdoptionCard
          plans={paidPlans}
          underusedBelow={data.verdictRules.promoteBelowRate}
          days={data.days}
          reviewedFeatures={reviewedFeatures}
          onFeatureSelect={onFeatureSelect}
        />
      </Group>

      <Group label="Trials">
        <TrialCard data={data} />
      </Group>

      <Group label="Where Sellers get stuck">
        <PipelineCard data={data} />
      </Group>

      <p className="text-xs text-slate-500">
        Plans under {data.minimumSample} subscribers are marked “not enough data”. Cost estimate:{" "}
        {data.unitCosts
          .map(
            (cost) =>
              `${cost.label} ${cost.isMeasured ? "(measured)" : `${formatCostVnd(cost.costVnd)} each`}`
          )
          .join(" · ")}
        .
      </p>
    </>
  );
}

const VERDICT_STYLE: Record<PlanVerdict["tone"], { chip: string; accent: string }> = {
  danger: { chip: "bg-[#e76e50]/12 text-[#c4553a]", accent: "border-t-[#e76e50]" },
  warning: { chip: "bg-amber-100 text-amber-800", accent: "border-t-amber-400" },
  info: { chip: "bg-[#5b7aa6]/12 text-[#3f5f8a]", accent: "border-t-[#5b7aa6]" },
  success: { chip: "bg-[#2a9d8f]/12 text-[#21796e]", accent: "border-t-[#2a9d8f]" },
  neutral: { chip: "bg-slate-100 text-slate-600", accent: "border-t-slate-200" },
};

// One card per paid plan: the verdict the rules reached, the figures behind it and what to do.
function VerdictCards({ data }: { data: PlanInsights }) {
  const rules = data.verdictRules;
  return (
    <div className="space-y-2">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.verdicts.map((verdict) => {
          const style = VERDICT_STYLE[verdict.tone];
          return (
            <Card
              key={verdict.key}
              className={cn("gap-0 rounded-2xl border border-t-4 border-slate-200 bg-white p-5 shadow-none", style.accent)}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-slate-900">{verdict.name}</p>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", style.chip)}>
                  {verdict.verdictLabel}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {verdict.evidence.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {verdict.action && (
                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Next step: </span>
                  {verdict.action}
                </p>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Judged by fixed rules on the last {data.days} days: a plan priced {rules.premiumPriceRatio}× or more above
        the one below whose Sellers use no more is overpriced; the plan keeping the fewest customers (under{" "}
        {rules.lowRetentionRate}%) is a retention risk; Sellers already making as many designs and mockups as a
        typical Seller on a plan above (on sale, and used more) are upsell candidates; an included feature under{" "}
        {rules.promoteBelowRate}% use is worth promoting. Plans under {data.minimumSample} subscribers are not judged.
        Retention matches the Revenue page for the same days.
      </p>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">{label}</h2>
      {children}
    </section>
  );
}

function Panel({
  title,
  subtitle,
  aside,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-none",
        className
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-slate-400">{text}</p>;
}

function Meter({
  value,
  color = BAR,
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full rounded-full", color)}
        style={{ width: `${Math.min(100, Math.max(value, value > 0 ? 2 : 0))}%` }}
      />
    </div>
  );
}

function KpiStrip({ data }: { data: PlanInsights }) {
  const paidSubscribers = data.plans
    .filter((plan) => !plan.isTrial)
    .reduce((sum, plan) => sum + plan.subscribers, 0);
  const runningTrials = data.plans.find((plan) => plan.isTrial)?.subscribers ?? 0;
  const delta =
    data.trial.conversionRate !== null && data.trial.previousConversionRate !== null
      ? Math.round((data.trial.conversionRate - data.trial.previousConversionRate) * 10) / 10
      : null;
  const added = data.pipeline[0]?.products ?? 0;
  const exported = data.pipeline.at(-1)?.products ?? 0;

  const items: { label: string; value: string; hint: string; delta?: number | null }[] = [
    {
      label: "Paying subscribers",
      value: paidSubscribers.toLocaleString(),
      hint: `${runningTrials} more on a Pro trial`,
    },
    {
      label: "Trials started",
      value: data.trial.started.toLocaleString(),
      hint: `in the last ${data.days} days`,
    },
    {
      label: "Trial conversion",
      value: formatRate(data.trial.conversionRate),
      // Both periods count finished trials only, so the two rates compare like for like.
      hint: `of finished trials, vs ${formatRate(data.trial.previousConversionRate)} before${
        data.trial.running > 0 ? ` · ${data.trial.running} still on trial, not counted` : ""
      }`,
      delta,
    },
    {
      label: "Products exported",
      value: exported.toLocaleString(),
      hint: `of ${added.toLocaleString()} added (${formatRate(added > 0 ? Math.round((exported / added) * 1000) / 10 : null)})`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.label}
          className="gap-0 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-none"
        >
          <p className="text-sm text-slate-500">{item.label}</p>
          <div className="mt-2 flex items-center gap-2.5">
            <p className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {item.value}
            </p>
            {item.delta !== undefined && item.delta !== null && item.delta !== 0 && (
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  item.delta > 0
                    ? "bg-[#2a9d8f]/10 text-[#21796e]"
                    : "bg-[#e76e50]/10 text-[#c4553a]"
                )}
              >
                {item.delta > 0 ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {Math.abs(item.delta)} pp
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{item.hint}</p>
        </Card>
      ))}
    </div>
  );
}

const TRIAL_OUTCOMES = [
  { key: "convertedToPro", label: "Bought Pro", color: TEAL },
  { key: "convertedToStarter", label: "Bought Starter", color: "bg-[#2a9d8f]/55" },
  { key: "convertedToOther", label: "Bought another plan", color: "bg-[#2a9d8f]/30" },
  { key: "running", label: "Still on trial", color: BAR_LIGHT },
  { key: "returnedToFree", label: "Back to Free", color: "bg-slate-300" },
] as const;

function TrialCard({ data }: { data: PlanInsights }) {
  const { trial } = data;
  const total = Math.max(1, trial.started);
  const converted = trial.convertedToPro + trial.convertedToStarter + trial.convertedToOther;

  // Every feature at least one trial used, the widest gap between buyers and the rest first.
  const compared = trial.featureComparison.filter((item) => item.convertedRate !== null && item.notConvertedRate !== null);
  const used = compared
    .filter((item) => (item.convertedRate ?? 0) > 0 || (item.notConvertedRate ?? 0) > 0)
    .map((item) => ({ ...item, gap: Math.round(((item.convertedRate ?? 0) - (item.notConvertedRate ?? 0)) * 10) / 10 }))
    .sort((a, b) => b.gap - a.gap);
  const unused = compared.filter((item) => item.convertedRate === 0 && item.notConvertedRate === 0);

  return (
    <Panel
      title="Pro trial"
      subtitle={`${trial.started.toLocaleString()} trial${trial.started === 1 ? "" : "s"} started in the last ${data.days} days.`}
    >
      {trial.started === 0 ? (
        <Empty text="No trials started in this period." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* How the trials ended. */}
          <div>
            <p className="text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">{formatRate(trial.conversionRate)}</p>
            <p className="mt-1 text-sm text-slate-500">
              of finished trials bought a plan ({converted} of {converted + trial.returnedToFree})
            </p>
            {trial.running > 0 && (
              <p className="text-xs text-slate-500">
                {trial.running} {trial.running === 1 ? "trial is" : "trials are"} still running and not counted yet.
              </p>
            )}
            <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full">
              {TRIAL_OUTCOMES.map((outcome) =>
                trial[outcome.key] > 0 ? (
                  <div
                    key={outcome.key}
                    className={outcome.color}
                    style={{ width: `${(trial[outcome.key] / total) * 100}%` }}
                    title={`${outcome.label}: ${trial[outcome.key]}`}
                  />
                ) : null
              )}
            </div>
            <ul className="mt-4 space-y-2">
              {TRIAL_OUTCOMES.filter((outcome) => trial[outcome.key] > 0).map((outcome) => (
                <li key={outcome.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className={cn("size-2.5 rounded-sm", outcome.color)} />
                    {outcome.label}
                  </span>
                  <span className="font-semibold text-slate-900 tabular-nums">{trial[outcome.key]}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What the trials that bought used, next to those that went back to Free. */}
          <div className="lg:col-span-2 lg:border-l lg:border-slate-100 lg:pl-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">What trial users used</p>
                <p className="mt-0.5 text-xs text-slate-500">Share of finished trials that used each Pro feature, widest gap first.</p>
              </div>
              <p className="flex items-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-sm", TEAL)} /> Bought
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-slate-300" /> Back to Free
                </span>
              </p>
            </div>

            {used.length === 0 ? (
              <Empty text="No trial used a feature yet." />
            ) : (
              <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {used.map((item) => {
                  const { name, ai } = splitAiLabel(item.label);
                  return (
                    <li key={item.metric}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-slate-800">
                          {name}
                          {ai && (
                            <span className="ml-1.5 rounded bg-[#5b7aa6]/12 px-1 py-px text-[10px] font-semibold text-[#3f5f8a]">AI</span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-px text-[10px] font-semibold tabular-nums",
                            item.gap >= 20 ? "bg-[#2a9d8f]/15 text-[#21796e]" : "bg-slate-100 text-slate-600"
                          )}
                          title="Percentage points more of the trials that bought used it"
                        >
                          {item.gap > 0 ? "+" : ""}
                          {item.gap.toFixed(1)} pts
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-1 text-xs tabular-nums">
                        <TrialBar value={item.convertedRate ?? 0} color={TEAL} label="Bought" />
                        <TrialBar value={item.notConvertedRate ?? 0} color="bg-slate-300" label="Back to Free" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {unused.length > 0 && (
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Not used in any trial: {unused.map((item) => splitAiLabel(item.label).name).join(", ")}.
              </p>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function TrialBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2" aria-label={`${label}: ${formatShare(value)}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-11 text-right font-medium text-slate-700">{formatShare(value)}</span>
    </div>
  );
}

// The steps in a row: each counts the products that reached it and every step before it.
function PipelineCard({ data }: { data: PlanInsights }) {
  const first = Math.max(1, data.pipeline[0]?.products ?? 0);
  return (
    <Panel
      title="Pipeline funnel"
      subtitle={`How far the products added in the last ${data.days} days got. Each step counts only products that passed every step before it.`}
    >
      <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {data.pipeline.map((stage, index) => {
          const previous = index === 0 ? stage.products : data.pipeline[index - 1].products;
          const drop = index > 0 && previous > 0 ? Math.round(((previous - stage.products) / previous) * 100) : 0;
          const share = Math.round((stage.products / first) * 1000) / 10;
          return (
            <li key={stage.key} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500">
                {index + 1}. {stage.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {stage.products.toLocaleString()}
              </p>
              <Meter value={share} className="mt-2" color={drop >= 20 ? CORAL : BAR} />
              <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
                {share.toFixed(1)}% of added
                {drop > 0 && (
                  <span className={cn("ml-1 font-semibold", drop >= 20 ? "text-[#b4482f]" : "text-slate-600")}>· −{drop}%</span>
                )}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-slate-500">−% is the share lost from the step before; coral marks a loss of 20% or more.</p>
    </Panel>
  );
}
