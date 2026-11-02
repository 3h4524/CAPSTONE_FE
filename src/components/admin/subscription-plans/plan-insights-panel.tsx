"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { ArrowScroller } from "@/components/admin/subscription-plans/arrow-scroller";
import { FeatureAdoptionCard } from "@/components/admin/subscription-plans/feature-adoption-card";
import { PlanAiReviewSection } from "@/components/admin/subscription-plans/plan-ai-review-section";
import { Card } from "@/components/ui/card";
import { formatShare, splitAiLabel } from "@/helpers/plan-adoption";
import { usePlanAiReview } from "@/hooks/queries/use-plan-ai-review";
import { usePlanInsights } from "@/hooks/queries/use-plan-insights";
import type { PlanInsights, PlanVerdict } from "@/types/plan-insights";
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

// The workflow's phases, each with the steps it runs, in run order, and its colour on the ribbon:
// violet, orange, aqua, yellow, checked to tell apart side by side (also with colour blindness).
// Every arrow carries its name, so the two lighter ones need no more contrast; ink is set per fill.
const PIPELINE_PHASES = [
  { name: "Design", keys: ["prompt_added", "prompt_written", "designed", "design_approved"], fill: "#6250d6", ink: "text-white" },
  { name: "Mockups", keys: ["mockups", "mockups_approved"], fill: "#eb6834", ink: "text-slate-900" },
  { name: "Video", keys: ["video", "video_approved"], fill: "#1baf7a", ink: "text-slate-900" },
  { name: "Deliver", keys: ["exported", "listing", "published"], fill: "#eda100", ink: "text-slate-900" },
];
const OTHER_PHASE = { name: "Workflow", keys: [] as string[], fill: "#6250d6", ink: "text-white" };

// An arrow: a point on the right, and a notch on the left that the arrow before fits into.
const ARROW = "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";
const FIRST_ARROW = "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)";

// The workflow's steps from the Seller's prompt to the push to a store as a ribbon of arrows,
// coloured by phase, with a column under each: the products that reached the step and every step
// before it, their share of the products added, and what the step lost from the one before.
function PipelineCard({ data }: { data: PlanInsights }) {
  const first = Math.max(1, data.pipeline[0]?.products ?? 0);
  const known = new Set(PIPELINE_PHASES.flatMap((phase) => phase.keys));
  // A response with other steps (an older backend) is shown in one colour, in its own order.
  const phaseOf = (key: string) =>
    data.pipeline.every((stage) => known.has(stage.key)) ? (PIPELINE_PHASES.find((phase) => phase.keys.includes(key)) ?? OTHER_PHASE) : OTHER_PHASE;
  const phases = [...new Set(data.pipeline.map((stage) => phaseOf(stage.key)))];

  return (
    <Panel>
      <ArrowScroller label="Workflow steps">
        <ol className="flex min-w-max gap-0">
          {data.pipeline.map((stage, index) => {
            const phase = phaseOf(stage.key);
            const previous = index === 0 ? stage.products : data.pipeline[index - 1].products;
            const drop = index > 0 && previous > 0 ? Math.round(((previous - stage.products) / previous) * 100) : 0;
            const share = Math.round((stage.products / first) * 1000) / 10;
            const isLive = stage.isAvailable !== false;
            const isBottleneck = isLive && drop >= 20;
            return (
              <li key={stage.key} className={cn("flex w-40 shrink-0 flex-col xl:w-auto xl:flex-1", index > 0 && "-ml-2")}>
                <div
                  className={cn("flex h-12 items-center pr-5 text-[13px] leading-tight font-semibold", phase.ink, index === 0 ? "pl-3" : "pl-6")}
                  style={{ backgroundColor: phase.fill, clipPath: index === 0 ? FIRST_ARROW : ARROW, opacity: isLive ? 1 : 0.45 }}
                  title={`${phase.name}: ${stage.label}`}
                >
                  <span className="mr-1.5 opacity-80">{index + 1}</span>
                  <span className="line-clamp-2">{stage.label}</span>
                </div>
                <div
                  className={cn(
                    "mt-1.5 flex-1 rounded-lg border p-3 tabular-nums",
                    index > 0 && "ml-2",
                    isBottleneck ? "border-[#e34948] ring-1 ring-[#e34948]" : "border-slate-200",
                    !isLive && "border-dashed"
                  )}
                  style={{ backgroundColor: isLive ? `${phase.fill}0d` : undefined }}
                >
                  {isLive ? (
                    <>
                      <p className="text-xl font-semibold tracking-tight text-slate-900">{stage.products.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{share.toFixed(1)}% of added</p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200/70">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, share)}%`, backgroundColor: phase.fill }} />
                      </div>
                      <p className="mt-2 min-h-5 text-[11px]">
                        {drop > 0 && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-px font-semibold",
                              isBottleneck ? "bg-[#e34948]/12 text-[#b42f2e]" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            −{drop}%{isBottleneck ? " · Bottleneck" : ""}
                          </span>
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-semibold text-slate-300">—</p>
                      <p className="text-xs text-slate-500" title="No executor yet.">Not live yet</p>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </ArrowScroller>
      <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {phases.map((phase) => (
          <span key={phase.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: phase.fill }} /> {phase.name}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-[#e34948] ring-1 ring-[#e34948]" /> Bottleneck: lost 20% or more of the step before
        </span>
      </p>
    </Panel>
  );
}
