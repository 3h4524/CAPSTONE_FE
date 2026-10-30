"use client";

import { Info } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  adoptionDrop,
  adoptionSummary,
  formatShare,
  isUnderused,
  MIN_DROP_POINTS,
  orderFeatures,
  SMALL_SAMPLE_SELLERS,
  splitAiLabel,
} from "@/helpers/plan-adoption";
import { getPlanColor } from "@/helpers/revenue-by-plan";
import type { FeatureAdoption, PlanGroupInsight } from "@/types/plan-insights";
import { cn } from "@/utils/cn";

// Steel blue bars; an underused feature only turns its bar orange, the figure stays as it is.
const BAR = "bg-[#47689a]";
const BAR_UNDERUSED = "bg-orange-400";

interface FeatureAdoptionCardProps {
  /** Paid plans, cheapest first: each is compared with the one before it. */
  plans: PlanGroupInsight[];
  /** The page's one "underused" threshold, in percent. */
  underusedBelow: number;
  days: number;
  /** Features the AI review comments on, which open that comment when clicked. */
  reviewedFeatures?: ReadonlySet<string>;
  onFeatureSelect?: (metric: string) => void;
}

interface CellView {
  plan: PlanGroupInsight;
  planIndex: number;
  cell: FeatureAdoption | undefined;
  previous: { name: string; rate: number | null } | null;
}

/**
 * Feature adoption: a sentence with what stands out, then one row per feature in workflow order and
 * one equal column per plan. Each cell is the share, then a bar; a clear drop from the plan before
 * is written out, and the rest of the detail is in a tooltip.
 */
export function FeatureAdoptionCard({ plans, underusedBelow, days, reviewedFeatures, onFeatureSelect }: FeatureAdoptionCardProps) {
  const features = orderFeatures(plans[0]?.adoption ?? []);
  const summary = adoptionSummary(plans, underusedBelow);

  // Each plan's cell for a feature, with the plan before it (by price) to compare with.
  const cellsFor = (metric: string): CellView[] =>
    plans.map((plan, planIndex) => {
      const cell = plan.adoption.find((item) => item.metric === metric);
      const before = planIndex > 0 ? plans[planIndex - 1] : null;
      const beforeCell = before?.adoption.find((item) => item.metric === metric);
      return {
        plan,
        planIndex,
        cell,
        previous: before ? { name: before.name, rate: beforeCell?.includedInPlan ? beforeCell.rate : null } : null,
      };
    });

  return (
    <TooltipProvider delayDuration={120}>
      <Card className="gap-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-none">
        <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-slate-900">
          Feature adoption
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="How to read this table" className="text-slate-400 hover:text-slate-600">
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs text-slate-100">
              Each bar is the share of a plan’s Sellers who used the feature at least once in the last {days} days. ▼ marks a drop
              of {MIN_DROP_POINTS} points or more from the plan before it. An orange bar is under {underusedBelow}%, the same
              underused rule the AI review uses. Hover a cell for the people behind it and how often the typical user used it.
            </TooltipContent>
          </Tooltip>
        </h3>
        <p className="mt-1 text-sm text-slate-500">Share of each plan’s Sellers who used each feature at least once.</p>

        {/* What stands out, said in words so the cells need no alarm colours. */}
        {summary.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        {plans.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No Sellers have a plan yet.</p>
        ) : (
          <>
            {/* Wide screens: the full width, the plans in equal columns. */}
            <div
              role="table"
              aria-label="Feature adoption by plan"
              className="mt-4 hidden md:grid"
              style={{ gridTemplateColumns: `minmax(9rem, 12rem) repeat(${plans.length}, minmax(0, 1fr))` }}
            >
              <div role="row" className="contents">
                <div role="columnheader" className="border-b border-slate-200 pb-2 text-xs font-medium text-slate-500">
                  Feature
                </div>
                {plans.map((plan, index) => (
                  <div key={plan.key} role="columnheader" className="border-b border-slate-200 px-3 pb-2">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <span className="size-2 rounded-full" style={{ backgroundColor: getPlanColor(plan.name, index) }} />
                      {plan.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {plan.subscribers.toLocaleString()} Sellers
                      {!plan.hasEnoughData && <span className="text-amber-800"> · not enough data</span>}
                    </p>
                  </div>
                ))}
              </div>

              {features.map((feature) => (
                <div key={feature.metric} role="row" className="group/row contents">
                  <div
                    role="rowheader"
                    className="flex items-center border-b border-slate-100 py-2 pr-3 group-focus-within/row:bg-slate-50 group-hover/row:bg-slate-50"
                  >
                    <FeatureName
                      label={feature.label}
                      onSelect={reviewedFeatures?.has(feature.metric) ? () => onFeatureSelect?.(feature.metric) : undefined}
                    />
                  </div>
                  {cellsFor(feature.metric).map((view) => (
                    <div
                      key={view.plan.key}
                      role="cell"
                      className="border-b border-slate-100 px-3 py-2 group-focus-within/row:bg-slate-50 group-hover/row:bg-slate-50"
                    >
                      <AdoptionCell view={view} feature={feature} underusedBelow={underusedBelow} days={days} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Narrow screens: one card per feature, one line per plan, no sideways scrolling. */}
            <ul className="mt-4 space-y-2 md:hidden">
              {features.map((feature) => (
                <li key={feature.metric} className="rounded-xl border border-slate-200 p-3">
                  <FeatureName
                    label={feature.label}
                    onSelect={reviewedFeatures?.has(feature.metric) ? () => onFeatureSelect?.(feature.metric) : undefined}
                  />
                  <div className="mt-2 space-y-1.5">
                    {cellsFor(feature.metric).map((view) => (
                      <div key={view.plan.key} className="flex items-center gap-2">
                        <span className="flex w-20 shrink-0 items-center gap-1.5 text-xs font-medium text-slate-700">
                          <span className="size-2 rounded-full" style={{ backgroundColor: getPlanColor(view.plan.name, view.planIndex) }} />
                          {view.plan.name}
                        </span>
                        <AdoptionCell view={view} feature={feature} underusedBelow={underusedBelow} days={days} />
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </TooltipProvider>
  );
}

function FeatureName({ label, onSelect }: { label: string; onSelect?: () => void }) {
  const { name, ai } = splitAiLabel(label);
  const content = (
    <>
      {name}
      {ai && <span className="ml-1.5 rounded bg-[#5b7aa6]/12 px-1 py-px text-[10px] font-semibold text-[#3f5f8a]">AI</span>}
    </>
  );
  return onSelect ? (
    <button
      type="button"
      onClick={onSelect}
      title="Open the AI review of this feature"
      className="text-left text-sm text-slate-800 underline-offset-2 hover:text-[#3f5f8a] hover:underline focus-visible:underline focus-visible:outline-none"
    >
      {content}
    </button>
  ) : (
    <span className="text-sm text-slate-800">{content}</span>
  );
}

function AdoptionCell({
  view,
  feature,
  underusedBelow,
  days,
}: {
  view: CellView;
  feature: FeatureAdoption;
  underusedBelow: number;
  days: number;
}) {
  const { plan, cell, previous } = view;
  const { name } = splitAiLabel(feature.label);
  if (!cell || !cell.includedInPlan) {
    return <span className="text-xs text-slate-500">Not in plan</span>;
  }

  const underused = isUnderused(cell.rate, underusedBelow);
  const drop = adoptionDrop(cell.rate, previous?.rate ?? null);
  const share = formatShare(cell.rate);
  const label = [
    `${name}, ${plan.name}, ${share}`,
    `${cell.users} of ${plan.subscribers} Sellers`,
    underused ? "underused" : null,
    drop !== null && previous ? `down ${drop.toFixed(1)} points from ${previous.name}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          aria-label={label}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[#5b7aa6]/50"
        >
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn("h-full rounded-full", underused ? BAR_UNDERUSED : BAR)}
              style={{ width: `${Math.min(100, Math.max(cell.rate, cell.rate > 0 ? 3 : 0))}%` }}
            />
          </div>
          {/* The figure after the bar, in a fixed width so the figures of a column still line up. */}
          <span className="w-12 shrink-0 text-right text-sm font-semibold text-slate-900">{share}</span>
          {/* Same width in every cell, so every bar in a column has the same scale. */}
          <span className="w-[4.75rem] shrink-0 text-[11px] font-semibold whitespace-nowrap text-slate-700">
            {drop !== null && previous ? `▼${drop.toFixed(1)} vs ${previous.name}` : ""}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="w-60 space-y-0.5 p-3 text-xs text-slate-100 [&_p]:text-slate-100">
        <p className="font-semibold">
          {name} · {plan.name}
        </p>
        <p>
          {cell.users} of {plan.subscribers} Sellers used it ({share})
        </p>
        {cell.medianUses != null && (
          <p>
            Typical user: {cell.medianUses.toLocaleString()}× in {days} days
          </p>
        )}
        {drop !== null && previous && (
          <p>
            ▼ {drop.toFixed(1)} points from {previous.name}
          </p>
        )}
        {underused && <p>Underused: under {underusedBelow}%</p>}
        {plan.subscribers < SMALL_SAMPLE_SELLERS && <p>Small sample: under {SMALL_SAMPLE_SELLERS} Sellers</p>}
      </TooltipContent>
    </Tooltip>
  );
}
