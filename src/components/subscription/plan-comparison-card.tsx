import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  catalogFeatures,
  formatPlanLimit,
  isSafetyCap,
  PLAN_FEATURES,
  type PlanFeatureDefinition,
  readPlanFeature,
} from "@/helpers/plan-features";
import { useFeatureCatalog } from "@/hooks/queries/use-feature-catalog";
import type { AvailablePlan, BillingCycle } from "@/types/subscription";
import { cn } from "@/utils/cn";
import { formatVnd } from "@/utils/format-currency";


type PlanLine = { key: string; label: string; included: boolean };

// What a plan includes, as the Seller compares plans. Safety caps stay off the card: they only
// stop abuse and are not part of what a plan sells.
// features carries the catalog labels and order (catalogFeatures); PLAN_FEATURES until it loads.
export const planLines = (plan: AvailablePlan, features: PlanFeatureDefinition[] = PLAN_FEATURES): PlanLine[] => {
  const lines: PlanLine[] = [
    {
      label:
        plan.quotas.maxBatchSize < 0
          ? "Any number of products per run"
          : `Up to ${formatPlanLimit(plan.quotas.maxBatchSize)} products per run`,
      included: true,
      key: "products_per_run",
    },
    {
      label:
        plan.quotas.maxConcurrentJobs < 0
          ? "Any number of jobs at once"
          : `${plan.quotas.maxConcurrentJobs} design job${plan.quotas.maxConcurrentJobs === 1 ? "" : "s"} at once`,
      included: true,
      key: "jobs_at_once",
    },
  ];

  for (const feature of features.filter((item) => !isSafetyCap(item.code))) {
    const { isEnabled, limitValue } = readPlanFeature(plan.features, feature.code);
    if (feature.code === "design_variations") {
      lines.push({
        label:
          limitValue === null
            ? "Up to 4 design variations per product"
            : `Up to ${limitValue} design variation${limitValue === 1 ? "" : "s"} per product`,
        included: isEnabled,
        key: feature.code,
      });
      continue;
    }
    if (feature.code === "monthly_listings") {
      // Shown only when the plan caps listings; no limit adds nothing to the list.
      if (limitValue !== null && isEnabled) lines.push({ key: feature.code, label: `Up to ${limitValue} listings a month`, included: true });
      continue;
    }
    if (feature.kind === "limit") continue;
    lines.push({ key: feature.code, label: feature.label, included: isEnabled });
  }

  return lines;
};

// The most features a card lists; the rest are counted, and all are listed at checkout.
const MAX_LINES = 6;


// How a card stands out: the plan in effect, the one suggested next, or neither.
export type PlanEmphasis = "current" | "recommended" | "none";

type PlanComparisonCardProps = {
  plan: AvailablePlan;
  hasActivePaidPlan: boolean;
  // Null when there's no active paid plan, or that plan's own card (currentPlanPrice is only
  // used to decide Upgrade vs Downgrade for every *other* card).
  currentPlanPrice: number | null;
  // The price shown: the monthly price, or the annual one when the plan has it.
  cycle: BillingCycle;
  emphasis: PlanEmphasis;
  // The next cheaper plan: the card lists only what this plan adds to it.
  basePlan?: AvailablePlan;
  onBuyClick: (plan: AvailablePlan) => void;
  onUpgradeClick: (plan: AvailablePlan) => void;
  onDowngradeClick: (plan: AvailablePlan) => void;
};

const BADGE: Record<PlanEmphasis, { label?: string; dot: string }> = {
  current: { label: "Current", dot: "bg-emerald-500" },
  recommended: { label: "Recommended", dot: "bg-orange-500" },
  none: { dot: "bg-sky-500" },
};

export const PlanComparisonCard = ({
  plan,
  hasActivePaidPlan,
  currentPlanPrice,
  cycle,
  emphasis,
  basePlan,
  onBuyClick,
  onUpgradeClick,
  onDowngradeClick,
}: PlanComparisonCardProps) => {
  // A trial runs on a plan without paying for it, so that plan is still bought, not "current".
  const isCurrent = plan.isCurrentPlan && hasActivePaidPlan;
  // Tier level is monthly-price ordering, matching the backend's own rule.
  const features = catalogFeatures(useFeatureCatalog().data);
  const isHigherTier = currentPlanPrice !== null && plan.monthlyPriceUsd > currentPlanPrice;
  const isLowerTier = currentPlanPrice !== null && plan.monthlyPriceUsd < currentPlanPrice;
  // Same price as the current plan but a different plan — neither Upgrade nor Downgrade applies,
  // and Buy is rejected server-side while a paid plan is active. Shouldn't happen with real
  // pricing, but disable rather than guess.
  const isUnavailable = hasActivePaidPlan && !isCurrent && !isHigherTier && !isLowerTier;

  const ctaLabel = isCurrent
    ? "Current plan"
    : !hasActivePaidPlan
      ? `Buy ${plan.name}`
      : isHigherTier
        ? "Upgrade plan"
        : isLowerTier
          ? "Downgrade"
          : "Unavailable";

  const handleClick = () => {
    if (isCurrent || isUnavailable) {
      return;
    }
    if (!hasActivePaidPlan) {
      onBuyClick(plan);
      return;
    }
    if (isHigherTier) {
      onUpgradeClick(plan);
      return;
    }
    if (isLowerTier) {
      onDowngradeClick(plan);
    }
  };

  // Only what the plan includes, and on a higher plan only what the cheaper one lacks: the rest is
  // said in one line ("Everything in Starter, plus"). The checkout lists everything.
  const baseLines = basePlan
    ? new Set(planLines(basePlan, features).filter((line) => line.included).map((line) => line.label))
    : null;
  const added = planLines(plan, features).filter((line) => line.included && !baseLines?.has(line.label));
  const included = added.slice(0, MAX_LINES);
  const more = added.length - included.length;
  const showsAnnual = cycle === "annual" && plan.annualPriceVnd !== null;
  const isDark = emphasis === "recommended";
  const badge = BADGE[emphasis];

  return (
    <Card
      className={cn(
        "@container relative flex h-full flex-col gap-0 rounded-2xl p-6 shadow-sm max-md:p-5",
        isDark
          ? "isolate overflow-hidden border-slate-800 bg-linear-to-b from-slate-800 via-slate-900 to-slate-950 text-white shadow-2xl ring-1 shadow-slate-900/30 ring-white/10 ring-inset"
          : "border-ink-200 bg-card"
      )}
    >
      {isDark && (
        // A soft light from the top edge, as on a glass panel.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14),transparent_70%)]"
        />
      )}
      {/* Rivets in the corners, a quiet frame for the card. */}
      {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((spot) => (
        <span
          key={spot}
          aria-hidden="true"
          className={cn("absolute size-1.5 rounded-full", spot, isDark ? "bg-white/20" : "bg-ink-200")}
        />
      ))}

      <div className="flex items-start justify-between gap-3">
        <h3 className={cn("text-base font-semibold", isDark ? "text-white" : "text-ink-900")}>{plan.name}</h3>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
            isDark
              ? "border-orange-300/40 dark:border-orange-500/40 bg-orange-400/15 text-orange-200"
              : "border-ink-200 bg-card text-ink-700"
          )}
        >
          <span className={cn("size-1.5 rounded-full", isDark ? "bg-orange-300" : badge.dot)} />
          {badge.label ?? plan.tier}
        </span>
      </div>

      <div className="mt-5">
        <p className="flex items-baseline gap-1.5">
          <span className={cn("text-3xl font-bold tracking-tight tabular-nums", isDark ? "text-white" : "text-ink-900")}>
            {formatVnd(showsAnnual ? plan.annualPriceVnd! : plan.monthlyPriceVnd)}
          </span>
          <span className={cn("text-sm", isDark ? "text-ink-300" : "text-ink-500")}>
            /{showsAnnual ? "year" : "month"}
          </span>
        </p>
        <p className={cn("mt-1 min-h-4 text-xs", isDark ? "text-ink-400" : "text-ink-500")}>
          {showsAnnual
            ? `≈ ${formatVnd(Math.round(plan.annualPriceVnd! / 12))} a month`
            : cycle === "annual"
              ? "Monthly billing only"
              : plan.annualPriceVnd !== null
                ? `or ${formatVnd(plan.annualPriceVnd)} a year`
                : ""}
        </p>
      </div>

      <Button
        className={cn(
          "mt-5 w-full",
          isDark &&
            !isCurrent &&
            "bg-card text-ink-900 shadow-[0_0_16px_rgba(255,255,255,0.25)] hover:bg-ink-100",
          isCurrent && "bg-ink-100 text-ink-700 hover:bg-ink-100 disabled:opacity-100"
        )}
        variant={isCurrent ? "secondary" : isDark ? "secondary" : "default"}
        disabled={isCurrent || isUnavailable}
        onClick={handleClick}
      >
        {ctaLabel}
      </Button>

      {plan.description && (
        <p className={cn("mt-5 text-sm", isDark ? "text-ink-300" : "text-ink-500")}>{plan.description}</p>
      )}

      {basePlan && (
        <p className={cn("mt-5 text-sm font-semibold", isDark ? "text-white" : "text-ink-900")}>
          Everything in {basePlan.name}
          {added.length > 0 ? ", plus:" : "."}
        </p>
      )}
      <ul className={cn("grid flex-1 content-start gap-x-6 gap-y-2.5 text-sm @md:grid-cols-2", basePlan ? "mt-3" : "mt-5")}>
        {included.map((line) => (
          <li key={line.label} className={cn("flex items-start gap-2.5", isDark ? "text-slate-100" : "text-ink-700")}>
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                isDark ? "bg-orange-500/20 text-orange-300" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
            {line.label}
          </li>
        ))}
        {more > 0 && (
          <li className={cn("pl-6.5 text-xs", isDark ? "text-ink-400" : "text-ink-500")}>
            + {more} more, listed at checkout
          </li>
        )}
      </ul>
    </Card>
  );
};
