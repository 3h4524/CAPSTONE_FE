"use client";

import { Gauge, Info, type LucideIcon,TrendingDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  adoptionDrop,
  formatShare,
  isUnderused,
  MIN_DROP_POINTS,
  orderFeatures,
  SMALL_SAMPLE_SELLERS,
  splitAiLabel,
} from "@/helpers/plan-adoption";
import { getPlanColor } from "@/helpers/revenue-by-plan";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { FeatureAdoption, PlanGroupInsight } from "@/types/plan-insights";
import { cn } from "@/utils/cn";

// One steel blue for the share; an underused share turns orange, in the bar and the figure.
const BAR = "bg-[#47689a]";
const BAR_UNDERUSED = "bg-orange-400";

// Shares of the table's width, in percent; the plans split what is left equally.
const FEATURE_COLUMN = 22;
const FLAGS_COLUMN = 26;

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
  cell: FeatureAdoption | undefined;
  previous: { name: string; rate: number | null } | null;
}

type Flag = { label: string; style: string; icon: LucideIcon };

/**
 * Feature adoption as one table: a row per feature in workflow order, a column per plan with the
 * share, the people behind it and a thin bar, and a last column saying what stands out in that row
 * (underused, a daily cap reached), so nothing needs reading above the table.
 */
export function FeatureAdoptionCard({ plans, underusedBelow, days, reviewedFeatures, onFeatureSelect }: FeatureAdoptionCardProps) {
  const isPhone = useIsPhone();
  const features = orderFeatures(plans[0]?.adoption ?? []);

  // Each plan's cell for a feature, with the plan before it (by price) to compare with.
  const cellsFor = (metric: string): CellView[] =>
    plans.map((plan, planIndex) => {
      const cell = plan.adoption.find((item) => item.metric === metric);
      const before = planIndex > 0 ? plans[planIndex - 1] : null;
      const beforeCell = before?.adoption.find((item) => item.metric === metric);
      return { plan, cell, previous: before ? { name: before.name, rate: beforeCell?.includedInPlan ? beforeCell.rate : null } : null };
    });

  // What stands out for one feature across the plans, in a few words each.
  const flagsFor = (cells: CellView[]): Flag[] => {
    const included = cells.filter((view) => view.cell?.includedInPlan);
    const underused = included.filter((view) => isUnderused(view.cell!.rate, underusedBelow)).map((view) => view.plan.name);
    const capped = included.filter((view) => (view.cell!.usersAtDailyCap ?? 0) > 0);
    const flags: Flag[] = [];
    if (underused.length > 0)
      flags.push({ label: `Underused on ${underused.join(", ")}`, style: "bg-orange-100 dark:bg-orange-500/15 text-orange-800 dark:text-orange-300", icon: TrendingDown });
    if (capped.length > 0)
      flags.push({
        label: `Daily cap hit: ${capped.map((view) => `${view.cell!.usersAtDailyCap} on ${view.plan.name}`).join(", ")}`,
        style: "bg-ink-100 text-ink-700",
        icon: Gauge,
      });
    return flags;
  };

  // Columns of fixed shares, so the plan columns are equal and the bars line up across rows.
  const planWidth = `${(100 - FEATURE_COLUMN - FLAGS_COLUMN) / Math.max(1, plans.length)}%`;

  return (
    <TooltipProvider delayDuration={120}>
      <Card className="gap-0 overflow-hidden rounded-2xl border border-ink-200 bg-card p-0 shadow-none">
        {/* How to read it, in view: the bar, the orange of underused, and the drop mark. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-ink-100 bg-ink-50/60 px-5 py-3 text-xs text-ink-500">
          <p>Share of each plan’s Sellers who used a feature at least once in the last {days} days.</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-5 rounded-full", BAR)} /> Used
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-5 rounded-full", BAR_UNDERUSED)} /> Underused, under {underusedBelow}%
            </span>
            <span className="flex items-center gap-1 font-semibold text-[#c4553a] dark:text-[#dea091]">
              ▼<span className="font-normal text-ink-500">{MIN_DROP_POINTS}+ points below the cheaper plan</span>
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="How to read this table" className="text-ink-400 hover:text-ink-600">
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs text-background">
                The figure is the share; the small one the Sellers behind it. Hover a figure for how often the typical user used it.
                Underused uses the same {underusedBelow}% rule as the AI review.
              </TooltipContent>
            </Tooltip>
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">No Sellers have a plan yet.</p>
        ) : isPhone ? (
          <ul aria-label="Feature adoption by plan" className="divide-y divide-ink-100">
            {features.map((feature) => {
              const cells = cellsFor(feature.metric);
              const flags = flagsFor(cells);
              return (
                <li key={feature.metric} className="space-y-2 px-4 py-3">
                  <FeatureName
                    label={feature.label}
                    onSelect={reviewedFeatures?.has(feature.metric) ? () => onFeatureSelect?.(feature.metric) : undefined}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    {cells.map((view) => (
                      <div key={view.plan.key} className="min-w-0">
                        <p className="mb-1 truncate text-xs font-medium text-ink-500">{view.plan.name}</p>
                        <AdoptionCell view={view} feature={feature} underusedBelow={underusedBelow} days={days} />
                      </div>
                    ))}
                  </div>
                  {flags.map((flag) => (
                    <span key={flag.label} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", flag.style)}>
                      <flag.icon className="size-3 shrink-0" />
                      {flag.label}
                    </span>
                  ))}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Feature adoption by plan" className="w-full min-w-[760px] table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: `${FEATURE_COLUMN}%` }} />
                {plans.map((plan) => (
                  <col key={plan.key} style={{ width: planWidth }} />
                ))}
                <col style={{ width: `${FLAGS_COLUMN}%` }} />
              </colgroup>
              <thead>
                <tr className="border-b border-ink-200 text-left">
                  <th scope="col" className="px-5 py-3 text-xs font-medium text-ink-500">
                    Feature
                  </th>
                  {plans.map((plan, index) => (
                    <th key={plan.key} scope="col" className="px-5 py-3 font-normal">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                        <span className="size-2 rounded-full" style={{ backgroundColor: getPlanColor(plan.name, index) }} />
                        {plan.name}
                        <span className="text-xs font-normal text-ink-400">· {plan.subscribers.toLocaleString()} Sellers</span>
                      </span>
                      {!plan.hasEnoughData && <span className="text-xs text-amber-800 dark:text-amber-300">Not enough data</span>}
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-3 text-xs font-medium text-ink-500">
                    What stands out
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {features.map((feature) => {
                  const cells = cellsFor(feature.metric);
                  const flags = flagsFor(cells);
                  return (
                    <tr key={feature.metric} className="hover:bg-ink-50/70">
                      <th scope="row" className="truncate px-5 py-3.5 text-left font-normal">
                        <FeatureName
                          label={feature.label}
                          onSelect={reviewedFeatures?.has(feature.metric) ? () => onFeatureSelect?.(feature.metric) : undefined}
                        />
                      </th>
                      {cells.map((view) => (
                        <td key={view.plan.key} className="px-5 py-3.5 align-middle">
                          <AdoptionCell view={view} feature={feature} underusedBelow={underusedBelow} days={days} />
                        </td>
                      ))}
                      <td className="px-5 py-3.5">
                        {flags.length > 0 && (
                          <span className="flex flex-col items-start gap-1">
                            {flags.map((flag) => (
                              <span key={flag.label} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", flag.style)}>
                                <flag.icon className="size-3 shrink-0" />
                                {flag.label}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
      {ai && <span className="ml-1.5 rounded bg-[#5b7aa6]/12 px-1 py-px text-[10px] font-semibold text-[#3f5f8a] dark:text-[#9db4d2]">AI</span>}
    </>
  );
  return onSelect ? (
    <button
      type="button"
      onClick={onSelect}
      title="Open the AI review of this feature"
      className="text-left text-sm text-ink-800 underline-offset-2 hover:text-[#3f5f8a] dark:hover:text-[#9db4d2] hover:underline focus-visible:underline focus-visible:outline-none"
    >
      {content}
    </button>
  ) : (
    <span className="text-sm text-ink-800">{content}</span>
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
    return <span className="text-xs text-ink-400">Not in plan</span>;
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
          className="rounded-md tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[#5b7aa6]/50"
        >
          <div className="flex items-baseline gap-2">
            <span className={cn("text-sm font-semibold", underused ? "text-orange-700 dark:text-orange-300" : "text-ink-900")}>{share}</span>
            {drop !== null && previous && (
              <span className="text-[11px] font-semibold whitespace-nowrap text-[#c4553a] dark:text-[#dea091]">
                ▼{drop.toFixed(1)} vs {previous.name}
              </span>
            )}
            <span className="ml-auto text-[11px] text-ink-400">
              {cell.users}/{plan.subscribers}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn("h-full rounded-full", underused ? BAR_UNDERUSED : BAR)}
              style={{ width: `${Math.min(100, Math.max(cell.rate, cell.rate > 0 ? 2 : 0))}%` }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="w-60 space-y-0.5 p-3 text-xs text-background [&_p]:text-background">
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
