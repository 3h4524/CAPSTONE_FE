"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TFunction } from "i18next";
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
import { useTranslation } from "react-i18next";

import { ArrowScroller } from "@/components/admin/subscription-plans/arrow-scroller";
import { FeatureAdoptionCard } from "@/components/admin/subscription-plans/feature-adoption-card";
import { PlanAiReviewSection } from "@/components/admin/subscription-plans/plan-ai-review-section";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatShare, splitAiLabel } from "@/helpers/plan-adoption";
import { usePlanAiReview } from "@/hooks/queries/use-plan-ai-review";
import { usePlanInsights } from "@/hooks/queries/use-plan-insights";
import { useIsPhone } from "@/hooks/use-is-phone";
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
      <Card className="border-ink-200 bg-card h-28 animate-pulse rounded-2xl border" />
      <Card className="border-ink-200 bg-card h-80 animate-pulse rounded-2xl border" />
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
  const { t } = useTranslation("common");
  // Running trials have their own card; the plan comparisons only show the plans people pay for.
  const paidPlans = data.plans.filter((plan) => !plan.isTrial);

  return (
    <>
      <Group id="insights-features" label={t("admin.plans.insights.featureUse")} description={t("admin.plans.insights.featureUseDescription")}>
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
        label={t("admin.plans.insights.trials")}
        description={t("admin.plans.insights.trialsDescription", { count: data.trial.started, days: data.days })}
      >
        <TrialCard data={data} />
      </Group>

      <Group
        id="insights-pipeline"
        label={t("admin.plans.insights.whereStuck")}
        description={t("admin.plans.insights.whereStuckDescription", { days: data.days })}
      >
        <PipelineCard data={data} />
      </Group>

      <p className="text-ink-500 text-xs">
        {t("admin.plans.insights.minimumSample", { minimum: data.minimumSample })}{" "}
        {t("admin.plans.insights.costEstimate")}{" "}
        {data.unitCosts
          .map(
            (cost) =>
              `${cost.label} ${cost.isMeasured ? t("admin.plans.insights.measured") : t("admin.plans.insights.eachSuffix", { amount: formatCostVnd(cost.costVnd) })}`
          )
          .join(" · ")}
        .
      </p>
    </>
  );
}

const VERDICT_STYLE: Record<PlanVerdict["tone"], { chip: string; accent: string }> = {
  danger: { chip: "bg-[#e76e50]/12 text-[#c4553a] dark:text-[#dea091]", accent: "border-t-[#e76e50]" },
  warning: { chip: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300", accent: "border-t-amber-400" },
  info: { chip: "bg-[#5b7aa6]/12 text-[#3f5f8a] dark:text-[#9db4d2]", accent: "border-t-[#5b7aa6]" },
  success: { chip: "bg-[#2a9d8f]/12 text-[#21796e] dark:text-[#8fe0d6]", accent: "border-t-[#2a9d8f]" },
  neutral: { chip: "bg-ink-100 text-ink-600", accent: "border-t-ink-200" },
};

// One card per paid plan: the verdict the rules reached, the figures behind it and what to do.
function VerdictCards({ data }: { data: PlanInsights }) {
  const { t } = useTranslation("common");
  const rules = data.verdictRules;
  return (
    <div className="space-y-2">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.verdicts.map((verdict) => {
          const style = VERDICT_STYLE[verdict.tone];
          return (
            <Card
              key={verdict.key}
              className={cn("border-ink-200 bg-card gap-0 rounded-2xl border border-t-4 p-5 shadow-none", style.accent)}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-ink-900 text-[15px] font-semibold">{verdict.name}</p>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", style.chip)}>
                  {verdict.verdictLabel}
                </span>
              </div>
              <ul className="text-ink-600 mt-3 space-y-1.5 text-sm">
                {verdict.evidence.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="bg-ink-400 mt-2 size-1 shrink-0 rounded-full" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {verdict.action && (
                <p className="bg-ink-50 text-ink-700 mt-4 rounded-lg px-3 py-2 text-sm">
                  <span className="text-ink-900 font-semibold">{t("admin.plans.healthDetail.nextStep")} </span>
                  {verdict.action}
                </p>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-ink-500 text-xs">
        {t("admin.plans.insights.judgedByRules", {
          days: data.days,
          ratio: rules.premiumPriceRatio,
          low: rules.lowRetentionRate,
          promote: rules.promoteBelowRate,
          minimum: data.minimumSample,
        })}
      </p>
    </div>
  );
}

const SECTIONS = [
  { id: "plan-health", labelKey: "admin.plans.aiReview.planHealth" },
  { id: "insights-features", labelKey: "admin.plans.insights.featureUse" },
  { id: "insights-trials", labelKey: "admin.plans.insights.trials" },
  { id: "insights-pipeline", labelKey: "admin.plans.insights.pipeline" },
] as const;

// Jumps between the sections of a long page, and marks the one in view; sticks under the top bar.
function SectionNav({ days }: { days: number }) {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const jumpTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      aria-label={t("admin.plans.insights.sectionsAria")}
      className="bg-ink-50/90 sticky top-[53px] z-10 -mx-1 flex items-center justify-between gap-3 px-1 py-2 backdrop-blur max-md:top-[65px]"
    >
      {isPhone ? (
        <Select value={active} onValueChange={jumpTo}>
          <SelectTrigger aria-label={t("admin.plans.insights.jumpToSection")} className="bg-card w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="bg-card w-(--radix-select-trigger-width)">
            {SECTIONS.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {t(section.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
      <div className="border-ink-200 bg-card flex gap-1 overflow-x-auto rounded-full border p-1 shadow-xs">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(event) => {
              event.preventDefault();
              jumpTo(section.id);
            }}
            aria-current={active === section.id ? "location" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              active === section.id ? "bg-ink-900 text-card" : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            )}
          >
            {t(section.labelKey)}
          </a>
        ))}
      </div>
      )}
      <span className="border-ink-200 bg-card text-ink-600 hidden shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium sm:inline">
        {t("admin.plans.insights.lastDays", { days })}
      </span>
    </nav>
  );
}

function Group({ id, label, description, children }: { id: string; label: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 space-y-4">
      <div>
        <h2 className="text-ink-900 text-lg font-semibold tracking-tight">{label}</h2>
        {description && <p className="text-ink-500 mt-0.5 max-w-3xl text-sm">{description}</p>}
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
        "border-ink-200 bg-card gap-0 rounded-2xl border p-6 shadow-none",
        className
      )}
    >
      {(title || aside) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-ink-900 text-[15px] font-semibold">{title}</h3>}
            {subtitle && <p className="text-ink-500 mt-1 text-sm">{subtitle}</p>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-ink-400 py-10 text-center text-sm">{text}</p>;
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
        delta > 0 ? "bg-[#2a9d8f]/10 text-[#21796e] dark:text-[#8fe0d6]" : "bg-[#e76e50]/10 text-[#c4553a] dark:text-[#dea091]"
      )}
    >
      {delta > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {Math.abs(delta)} pp
    </span>
  );
}

// Who bought: one entry per plan bought, from the per-plan counts when the backend sends them.
const boughtByPlan = (trial: PlanInsights["trial"], t: TFunction) =>
  (trial.convertedByPlan?.length
    ? trial.convertedByPlan.map((plan) => ({ name: plan.name, count: plan.count }))
    : [
        { name: t("admin.plans.insights.boughtPro"), count: trial.convertedToPro },
        { name: t("admin.plans.insights.boughtStarter"), count: trial.convertedToStarter },
        { name: t("admin.plans.insights.anotherPlan"), count: trial.convertedToOther },
      ]
  ).filter((item) => item.count > 0);

// The trials as four figures, then one table of what the trials that bought used against the
// trials that went back to Free: plain numbers, a thin bar each, and the gap.
function TrialCard({ data }: { data: PlanInsights }) {
  const { t } = useTranslation("common");
  const { trial } = data;
  const bought = boughtByPlan(trial, t);
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
        <Empty text={t("admin.plans.insights.noTrialsStarted")} />
      </Panel>
    );
  }

  return (
    <Panel className="p-0">
      <dl className="divide-ink-100 border-ink-100 grid grid-cols-2 border-b lg:grid-cols-4 lg:divide-x">
        <Figure label={t("admin.plans.insights.converted")} hint={t("admin.plans.insights.ofFinishedTrials", { converted, finished })}>
          <span className="flex items-center gap-2">
            {formatRate(trial.conversionRate)}
            <ConversionChange trial={trial} />
          </span>
        </Figure>
        <Figure label={t("admin.plans.insights.boughtPlan")} hint={bought.map((item) => `${item.name} ${item.count}`).join(" · ") || t("admin.plans.insights.noneYet")}>
          {converted.toLocaleString()}
        </Figure>
        <Figure label={t("admin.plans.insights.stillOnTrial")} hint={t("admin.plans.insights.notCountedUntilEnd")}>
          {trial.running.toLocaleString()}
        </Figure>
        <Figure label={t("admin.plans.insights.backToFree")} hint={finished > 0 ? t("admin.plans.insights.percentOfFinished", { percent: Math.round((trial.returnedToFree / finished) * 100) }) : ""}>
          {trial.returnedToFree.toLocaleString()}
        </Figure>
      </dl>

      <div className="px-6 pt-5 pb-6">
        <p className="text-ink-900 text-sm font-semibold">{t("admin.plans.insights.whatTrialUsersUsed")}</p>
        <p className="text-ink-500 mt-0.5 text-xs">
          {t("admin.plans.insights.whatTrialUsersUsedDescription")}
          {trial.previousConversionRate !== null && <> {t("admin.plans.insights.conversionWas", { rate: formatRate(trial.previousConversionRate), days: data.days })}</>}
        </p>

        {used.length === 0 ? (
          <Empty text={t("admin.plans.insights.noTrialUsed")} />
        ) : (
          <div className="max-md:overflow-x-auto">
          <table className="mt-3 w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr className="border-ink-200 text-ink-500 border-b text-left text-xs">
                <th scope="col" className="py-2 pr-4 font-medium">{t("admin.plans.shared.feature")}</th>
                <th scope="col" className="w-[28%] px-4 py-2 font-medium">{t("admin.plans.insights.bought")}</th>
                <th scope="col" className="w-[28%] px-4 py-2 font-medium">{t("admin.plans.insights.backToFree")}</th>
                <th scope="col" className="py-2 pl-4 text-right font-medium">{t("admin.plans.insights.gapHeader")}</th>
              </tr>
            </thead>
            <tbody className="divide-ink-100 divide-y">
              {used.map((item) => {
                const { name, ai } = splitAiLabel(item.label);
                return (
                  <tr key={item.metric} className="hover:bg-ink-50/70">
                    <th scope="row" className="text-ink-800 py-2.5 pr-4 text-left font-normal">
                      {name}
                      {ai && <span className="ml-1.5 rounded bg-[#5b7aa6]/12 px-1 py-px text-[10px] font-semibold text-[#3f5f8a] dark:text-[#9db4d2]">AI</span>}
                    </th>
                    <td className="px-4 py-2.5">
                      <ShareBar value={item.convertedRate ?? 0} color={TEAL} />
                    </td>
                    <td className="px-4 py-2.5">
                      <ShareBar value={item.notConvertedRate ?? 0} color="bg-ink-400" />
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      <span
                        className={cn(
                          "rounded px-1.5 py-px text-[11px] font-semibold",
                          item.gap >= 20 ? "bg-[#2a9d8f]/15 text-[#21796e] dark:text-[#8fe0d6]" : item.gap < 0 ? "bg-[#e76e50]/12 text-[#c4553a] dark:text-[#dea091]" : "bg-ink-100 text-ink-600"
                        )}
                        title={t("admin.plans.insights.gapTooltip")}
                      >
                        {item.gap > 0 ? "+" : ""}
                        {item.gap.toFixed(1)} {t("admin.plans.shared.pts")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
</div>
        )}
        {unused.length > 0 && (
          <p className="text-ink-500 mt-3 text-xs">{t("admin.plans.insights.notUsedInTrial", { list: unused.map((item) => splitAiLabel(item.label).name).join(", ") })}</p>
        )}
      </div>
    </Panel>
  );
}

function Figure({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5">
      <dt className="text-ink-500 text-xs font-medium">{label}</dt>
      <dd className="text-ink-900 mt-1 text-2xl font-semibold tracking-tight tabular-nums">{children}</dd>
      <dd className="text-ink-500 mt-0.5 text-xs">{hint}</dd>
    </div>
  );
}

// A share as a figure and a thin bar on a 0–100% scale.
function ShareBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-ink-900 w-12 shrink-0 font-semibold">{formatShare(value)}</span>
      <span className="bg-ink-100 h-1.5 flex-1 overflow-hidden rounded-full">
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
  const { t } = useTranslation("common");
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
    <Card className="border-ink-200 bg-card gap-4 rounded-2xl border p-5 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-ink-900 text-base font-semibold">{t("admin.plans.insights.pipelineTitle")}</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            <span className="font-semibold text-[#5f8a4c] dark:text-[#b0cca3]">
              {t("admin.plans.insights.inProgress", { count: inProgress.toLocaleString() })}
            </span>
            {bottleneckStages.length > 0 && (
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {" "}
                {t("admin.plans.insights.stuckCount", { count: bottleneckStages.length.toLocaleString() })}
              </span>
            )}
            {" · "}
            {t("admin.plans.insights.productsInAll", { count: total.toLocaleString() })}
          </p>
        </div>
        <Link
          href="/batches"
          className="text-ink-800 inline-flex items-center gap-1 text-xs font-medium hover:text-black hover:underline"
        >
          {t("admin.plans.insights.openBatches")}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <ArrowScroller label={t("admin.plans.insights.pipelineSteps")} className="-mx-1">
        <div className="px-1 pb-1">
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
            className="bg-ink-200 absolute top-[17px] h-0.5 rounded-full"
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
                        ? "bg-card border-rose-400 text-rose-600 ring-2 ring-rose-100 dark:text-rose-400 dark:ring-rose-500/30"
                        : isReviewStage
                          ? "bg-card border-amber-400 text-amber-700 ring-2 ring-amber-100 dark:text-amber-300 dark:ring-amber-500/30"
                          : "border-ink-200 bg-card text-ink-700"
                  )}
                  title={
                    isBusiest
                      ? t("admin.plans.insights.mostProductsHere")
                      : isBottleneck
                        ? t("admin.plans.insights.stuckBottleneck", { drop })
                        : undefined
                  }
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "mt-2 flex max-w-full items-center gap-1 text-xs",
                    isBusiest ? "text-ink-900 font-semibold" : "text-ink-600"
                  )}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate" title={stage.label}>
                    {stage.label}
                  </span>
                </span>

                <div
                  className={cn(
                    "bg-card mt-3 flex w-full flex-1 flex-col gap-1 rounded-xl border p-2.5 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-md",
                    isBottleneck
                      ? "border-rose-300 dark:border-rose-500/40"
                      : isReviewStage && stage.products > 0
                        ? "border-amber-300 dark:border-amber-500/40"
                        : "border-ink-200/80",
                    !isLive && "border-dashed opacity-60"
                  )}
                >
                  <span
                    className={cn(
                      "text-ink-900 text-lg leading-none font-semibold tabular-nums",
                      (stage.products === 0 || !isLive) && "text-ink-400"
                    )}
                  >
                    {isLive ? stage.products.toLocaleString() : "—"}
                  </span>
                  <span className="text-ink-500 text-[11px] tabular-nums">
                    {isLive ? t("admin.plans.insights.percentOfProducts", { share: share.toFixed(1) }) : t("admin.plans.insights.notLiveYet")}
                  </span>
                  <div className="bg-ink-100 h-1.5 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isBottleneck ? "bg-rose-500" : isBusiest ? "bg-[#2fae93]" : "bg-ink-200"
                      )}
                      style={{ width: `${Math.min(100, isLive ? share : 0)}%` }}
                    />
                  </div>
                  <div className="mt-0.5 h-5">
                    {isBottleneck ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                        <Hourglass className="size-3" aria-hidden="true" />
                        {lost > 0 ? t("admin.plans.insights.lostStuck", { lost: lost.toLocaleString() }) : t("admin.plans.insights.dropPercent", { drop })}
                      </span>
                    ) : isReviewStage && stage.products > 0 ? (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                        {t("admin.plans.insights.waitsOnReview")}
                      </span>
                    ) : drop > 0 ? (
                      <span className="bg-ink-100 text-ink-600 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                        {t("admin.plans.insights.dropPercent", { drop })}
                      </span>
                    ) : !isLive ? (
                      <span className="bg-ink-100 text-ink-400 rounded-md px-1.5 py-0.5 text-[10px]">
                        {t("admin.plans.insights.notLiveYet")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        </div>
      </ArrowScroller>

      <ul className="text-muted-foreground border-ink-100 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-[11px]">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#2fae93]" />
          {t("admin.plans.insights.legendMost")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-rose-400" />
          {t("admin.plans.insights.legendStuck")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-amber-400" />
          {t("admin.plans.insights.legendReview")}
        </li>
      </ul>
    </Card>
  );
}
