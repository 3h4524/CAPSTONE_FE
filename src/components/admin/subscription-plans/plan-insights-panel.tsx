"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clapperboard,
  Hourglass,
  ImageIcon,
  Inbox,
  Layers,
  PencilLine,
  Search,
  Store,
  Tag,
} from "lucide-react";

import { FeatureAdoptionCard } from "@/components/admin/subscription-plans/feature-adoption-card";
import { PlanAiReviewSection } from "@/components/admin/subscription-plans/plan-ai-review-section";
import { Card } from "@/components/ui/card";
import { formatShare, splitAiLabel } from "@/helpers/plan-adoption";
import { usePlanAiReview } from "@/hooks/queries/use-plan-ai-review";
import { usePlanInsights } from "@/hooks/queries/use-plan-insights";
import type { PipelineStage, PlanInsights, PlanVerdict } from "@/types/plan-insights";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";

// Teal (--chart-2) marks what goes well, as for the trials that bought; coral (--chart-1) what goes
// badly and amber what needs a look.
const TEAL = "bg-[#2a9d8f]";

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
    <div className="mt-4 space-y-10">
      <SectionNav days={data?.days ?? 45} />

      {/* No headline tiles: each figure lives once, in the section it belongs to. */}
      {/* The AI review covers the same 45 days, as of the day it was written. */}
      <PlanAiReviewSection focusPlan={focusPlan} focusFeature={focusFeature} insights={data} />

      {/* Without an AI review the rule-based checks stand on their own; with one they sit in each plan's detail. */}
      {data && !aiReview?.latest && data.verdicts.length > 0 && <VerdictCards data={data} />}

      {(isLoading || !data) && <LoadingState />}

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
      <Group id="insights-features" label="Feature use" description="Which features each plan's Sellers actually use, and who runs into a daily cap.">
        <FeatureAdoptionCard
          plans={paidPlans}
          underusedBelow={data.verdictRules.promoteBelowRate}
          days={data.days}
          reviewedFeatures={reviewedFeatures}
          onFeatureSelect={onFeatureSelect}
        />
      </Group>

      <Group
        id="insights-trials"
        label="Trials"
        description={`${data.trial.started.toLocaleString()} free trial${data.trial.started === 1 ? "" : "s"} started in the last ${data.days} days: how they ended, and what the ones that bought used.`}
      >
        <TrialCard data={data} />
      </Group>

      <Group
        id="insights-pipeline"
        label="Where Sellers get stuck"
        description={`How far the products added in the last ${data.days} days got through a workflow run, from the prompt to the store. Each step counts only products that passed every step before it.`}
      >
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

const SECTIONS = [
  { id: "plan-health", label: "Plan health" },
  { id: "insights-features", label: "Feature use" },
  { id: "insights-trials", label: "Trials" },
  { id: "insights-pipeline", label: "Pipeline" },
] as const;

// Jumps between the sections of a long page, and marks the one in view; sticks under the top bar.
function SectionNav({ days }: { days: number }) {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A section counts as in view while its top is in the upper part of the screen.
      { rootMargin: "-120px 0px -60% 0px" }
    );
    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Plan Insights sections"
      className="sticky top-[53px] z-10 -mx-1 flex items-center justify-between gap-3 bg-[#f8fafc]/90 px-1 py-2 backdrop-blur"
    >
      <div className="flex gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1 shadow-xs">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(event) => {
              event.preventDefault();
              setActive(section.id);
              document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            aria-current={active === section.id ? "location" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              active === section.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            {section.label}
          </a>
        ))}
      </div>
      <span className="hidden shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 sm:inline">
        Last {days} days
      </span>
    </nav>
  );
}

function Group({ id, label, description, children }: { id: string; label: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{label}</h2>
        {description && <p className="mt-0.5 max-w-3xl text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// A card of figures; the section above it names it, so a title is only for a second card in a section.
function Panel({
  title,
  subtitle,
  aside,
  className,
  children,
}: {
  title?: string;
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
      {(title || aside) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-slate-400">{text}</p>;
}

// Percentage points the conversion moved since the period before; both count finished trials only.
function ConversionChange({ trial }: { trial: PlanInsights["trial"] }) {
  if (trial.conversionRate === null || trial.previousConversionRate === null) return null;
  const delta = Math.round((trial.conversionRate - trial.previousConversionRate) * 10) / 10;
  if (delta === 0) return null;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        delta > 0 ? "bg-[#2a9d8f]/10 text-[#21796e]" : "bg-[#e76e50]/10 text-[#c4553a]"
      )}
    >
      {delta > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {Math.abs(delta)} pp
    </span>
  );
}

// Who bought: one entry per plan bought, from the per-plan counts when the backend sends them.
const boughtByPlan = (trial: PlanInsights["trial"]) =>
  (trial.convertedByPlan?.length
    ? trial.convertedByPlan.map((plan) => ({ name: plan.name, count: plan.count }))
    : [
        { name: "Pro", count: trial.convertedToPro },
        { name: "Starter", count: trial.convertedToStarter },
        { name: "another plan", count: trial.convertedToOther },
      ]
  ).filter((item) => item.count > 0);

// The trials as four figures, then one table of what the trials that bought used against the
// trials that went back to Free: plain numbers, a thin bar each, and the gap.
function TrialCard({ data }: { data: PlanInsights }) {
  const { trial } = data;
  const bought = boughtByPlan(trial);
  const converted = bought.reduce((sum, item) => sum + item.count, 0);
  const finished = converted + trial.returnedToFree;

  // Every feature at least one trial used, the widest gap between buyers and the rest first.
  const compared = trial.featureComparison.filter((item) => item.convertedRate !== null && item.notConvertedRate !== null);
  const used = compared
    .filter((item) => (item.convertedRate ?? 0) > 0 || (item.notConvertedRate ?? 0) > 0)
    .map((item) => ({ ...item, gap: Math.round(((item.convertedRate ?? 0) - (item.notConvertedRate ?? 0)) * 10) / 10 }))
    .sort((a, b) => b.gap - a.gap);
  const unused = compared.filter((item) => item.convertedRate === 0 && item.notConvertedRate === 0);

  if (trial.started === 0) {
    return (
      <Panel>
        <Empty text="No trials started in this period." />
      </Panel>
    );
  }

  return (
    <Panel className="p-0">
      <dl className="grid grid-cols-2 divide-slate-100 border-b border-slate-100 lg:grid-cols-4 lg:divide-x">
        <Figure label="Converted" hint={`${converted} of ${finished} finished trials`}>
          <span className="flex items-center gap-2">
            {formatRate(trial.conversionRate)}
            <ConversionChange trial={trial} />
          </span>
        </Figure>
        <Figure label="Bought a plan" hint={bought.map((item) => `${item.name} ${item.count}`).join(" · ") || "None yet"}>
          {converted.toLocaleString()}
        </Figure>
        <Figure label="Still on trial" hint="Not counted until they end">
          {trial.running.toLocaleString()}
        </Figure>
        <Figure label="Back to Free" hint={finished > 0 ? `${Math.round((trial.returnedToFree / finished) * 100)}% of finished trials` : ""}>
          {trial.returnedToFree.toLocaleString()}
        </Figure>
      </dl>

      <div className="px-6 pt-5 pb-6">
        <p className="text-sm font-semibold text-slate-900">What trial users used</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Share of finished trials that used each feature at least once, the widest gap between those who bought and those who did not first.
          {trial.previousConversionRate !== null && <> Conversion was {formatRate(trial.previousConversionRate)} the {data.days} days before.</>}
        </p>

        {used.length === 0 ? (
          <Empty text="No trial used a feature yet." />
        ) : (
          <table className="mt-3 w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th scope="col" className="py-2 pr-4 font-medium">Feature</th>
                <th scope="col" className="w-[28%] px-4 py-2 font-medium">Bought</th>
                <th scope="col" className="w-[28%] px-4 py-2 font-medium">Back to Free</th>
                <th scope="col" className="py-2 pl-4 text-right font-medium">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {used.map((item) => {
                const { name, ai } = splitAiLabel(item.label);
                return (
                  <tr key={item.metric} className="hover:bg-slate-50/70">
                    <th scope="row" className="py-2.5 pr-4 text-left font-normal text-slate-800">
                      {name}
                      {ai && <span className="ml-1.5 rounded bg-[#5b7aa6]/12 px-1 py-px text-[10px] font-semibold text-[#3f5f8a]">AI</span>}
                    </th>
                    <td className="px-4 py-2.5">
                      <ShareBar value={item.convertedRate ?? 0} color={TEAL} />
                    </td>
                    <td className="px-4 py-2.5">
                      <ShareBar value={item.notConvertedRate ?? 0} color="bg-slate-400" />
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      <span
                        className={cn(
                          "rounded px-1.5 py-px text-[11px] font-semibold",
                          item.gap >= 20 ? "bg-[#2a9d8f]/15 text-[#21796e]" : item.gap < 0 ? "bg-[#e76e50]/12 text-[#c4553a]" : "bg-slate-100 text-slate-600"
                        )}
                        title="Percentage points more of the trials that bought used it"
                      >
                        {item.gap > 0 ? "+" : ""}
                        {item.gap.toFixed(1)} pts
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {unused.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">Not used in any trial: {unused.map((item) => splitAiLabel(item.label).name).join(", ")}.</p>
        )}
      </div>
    </Panel>
  );
}

function Figure({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{children}</dd>
      <dd className="mt-0.5 text-xs text-slate-500">{hint}</dd>
    </div>
  );
}

// A share as a figure and a thin bar on a 0–100% scale.
function ShareBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 font-semibold text-slate-900">{formatShare(value)}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={cn("block h-full rounded-full", color)} style={{ width: `${Math.min(100, value)}%` }} />
      </span>
    </div>
  );
}

const PIPELINE_STAGE_ICONS: Record<string, LucideIcon> = {
  // Admin Plan Insights keys
  prompt_added: Inbox,
  prompt_written: PencilLine,
  designed: ImageIcon,
  design_approved: Search,
  mockups: Layers,
  mockups_approved: CheckCircle2,
  video: Clapperboard,
  video_approved: CheckCircle2,
  exported: Tag,
  listing: Tag,
  published: Store,

  // Seller Dashboard keys fallback
  queued: Inbox,
  designing: PencilLine,
  design_review: Search,
  mockup: Layers,
  ready: CheckCircle2,
};

/**
 * Production pipeline stepper: displays how products progress from initial prompt to store,
 * showing where sellers get stuck with bottlenecks and review stages.
 */
function PipelineCard({ data }: { data: PlanInsights }) {
  const total = data.pipeline[0]?.products ?? 0;
  const first = Math.max(1, total);
  const published =
    data.pipeline.find((s) => s.key === "published")?.products ??
    (data.pipeline[data.pipeline.length - 1]?.products ?? 0);
  const inProgress = Math.max(0, total - published);

  const busiest = data.pipeline.reduce<PipelineStage | null>(
    (best, stage) => (stage.products > 0 && (!best || stage.products > best.products) ? stage : best),
    null
  );

  const bottleneckStages = data.pipeline.filter((stage, index) => {
    if (index === 0 || stage.isAvailable === false) return false;
    const previous = data.pipeline[index - 1].products;
    if (previous <= 0) return false;
    const drop = Math.round(((previous - stage.products) / previous) * 100);
    return drop >= 20;
  });

  return (
    <Card className="gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Production pipeline</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            <span className="font-semibold text-[#5f8a4c]">
              {inProgress.toLocaleString()} in progress
            </span>
            {bottleneckStages.length > 0 && (
              <span className="font-semibold text-rose-600">
                {" "}
                · {bottleneckStages.length.toLocaleString()} stuck
              </span>
            )}
            {" · "}
            {total.toLocaleString()} products in all
          </p>
        </div>
        <Link
          href="/batches"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 hover:text-black hover:underline"
        >
          Open batches
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol
          className="relative grid gap-2"
          style={{
            minWidth: `${Math.max(900, data.pipeline.length * 110)}px`,
            gridTemplateColumns: `repeat(${data.pipeline.length}, minmax(0, 1fr))`,
          }}
        >
          {/* The line joining the steps, from the first circle's centre to the last's. */}
          <span
            aria-hidden="true"
            className="absolute top-[17px] h-0.5 rounded-full bg-slate-200"
            style={{
              left: `calc(100% / (${data.pipeline.length * 2}))`,
              right: `calc(100% / (${data.pipeline.length * 2}))`,
            }}
          />
          {data.pipeline.map((stage, index) => {
            const Icon = PIPELINE_STAGE_ICONS[stage.key] ?? Layers;
            const share = first > 0 ? (stage.products / first) * 100 : 0;
            const previous = index === 0 ? stage.products : data.pipeline[index - 1].products;
            const drop = index > 0 && previous > 0 ? Math.round(((previous - stage.products) / previous) * 100) : 0;
            const lost = index > 0 && previous > 0 ? previous - stage.products : 0;
            const isLive = stage.isAvailable !== false;
            const isBottleneck = isLive && drop >= 20;
            const isBusiest = busiest?.key === stage.key && stage.products > 0;
            const isReviewStage = stage.key.includes("review") || stage.key.includes("approved");

            return (
              <li key={stage.key} className="relative flex min-w-0 flex-col items-center">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums transition-transform duration-300 hover:scale-110",
                    isBusiest
                      ? "border-[#2fae93] bg-[#2fae93] text-white shadow-md shadow-emerald-900/10"
                      : isBottleneck
                        ? "border-rose-400 bg-white text-rose-600 ring-2 ring-rose-100"
                        : isReviewStage
                          ? "border-amber-400 bg-white text-amber-700 ring-2 ring-amber-100"
                          : "border-slate-200 bg-white text-slate-700"
                  )}
                  title={
                    isBusiest
                      ? "Most products are here"
                      : isBottleneck
                        ? `Stuck bottleneck: −${drop}% drop from previous step`
                        : undefined
                  }
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "mt-2 flex max-w-full items-center gap-1 text-xs",
                    isBusiest ? "font-semibold text-slate-900" : "text-slate-600"
                  )}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate" title={stage.label}>
                    {stage.label}
                  </span>
                </span>

                <div
                  className={cn(
                    "mt-3 flex w-full flex-1 flex-col gap-1 rounded-xl border bg-white p-2.5 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-md",
                    isBottleneck
                      ? "border-rose-300"
                      : isReviewStage && stage.products > 0
                        ? "border-amber-300"
                        : "border-slate-200/80",
                    !isLive && "border-dashed opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "text-lg leading-none font-semibold text-slate-900 tabular-nums",
                      (stage.products === 0 || !isLive) && "text-slate-400"
                    )}
                  >
                    {isLive ? stage.products.toLocaleString() : "—"}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {isLive ? `${share.toFixed(1)}% of products` : "Not live yet"}
                  </span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isBottleneck ? "bg-rose-500" : isBusiest ? "bg-[#2fae93]" : "bg-slate-200"
                      )}
                      style={{ width: `${Math.min(100, isLive ? share : 0)}%` }}
                    />
                  </div>
                  <div className="mt-0.5 h-5">
                    {isBottleneck ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                        <Hourglass className="size-3" aria-hidden="true" />
                        {lost > 0 ? `${lost.toLocaleString()} stuck` : `−${drop}% drop`}
                      </span>
                    ) : isReviewStage && stage.products > 0 ? (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        Waits on review
                      </span>
                    ) : drop > 0 ? (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        −{drop}% drop
                      </span>
                    ) : !isLive ? (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">
                        Not live yet
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <ul className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-[11px]">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#2fae93]" />
          Where most products are
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-rose-400" />
          Stuck: taking far longer than usual
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-amber-400" />
          Waits on your review
        </li>
      </ul>
    </Card>
  );
}
