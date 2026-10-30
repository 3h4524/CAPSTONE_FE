import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPlanLimit, isSafetyCap, PLAN_FEATURES, readPlanFeature } from "@/helpers/plan-features";
import type { AvailablePlan } from "@/types/subscription";
import { formatVnd } from "@/utils/format-currency";

type PlanLine = { label: string; included: boolean };

// What a plan includes, as the Seller compares plans. Safety caps stay off the card: they only
// stop abuse and are not part of what a plan sells.
export const planLines = (plan: AvailablePlan): PlanLine[] => {
  const lines: PlanLine[] = [
    {
      label:
        plan.quotas.maxBatchSize < 0
          ? "Any number of products per run"
          : `Up to ${formatPlanLimit(plan.quotas.maxBatchSize)} products per run`,
      included: true,
    },
    {
      label:
        plan.quotas.maxConcurrentJobs < 0
          ? "Any number of jobs at once"
          : `${plan.quotas.maxConcurrentJobs} design job${plan.quotas.maxConcurrentJobs === 1 ? "" : "s"} at once`,
      included: true,
    },
  ];

  for (const feature of PLAN_FEATURES.filter((item) => !isSafetyCap(item.code))) {
    const { isEnabled, limitValue } = readPlanFeature(plan.features, feature.code);
    if (feature.kind === "limit") {
      lines.push({
        label:
          limitValue === null
            ? "Up to 4 design variations per product"
            : `Up to ${limitValue} design variation${limitValue === 1 ? "" : "s"} per product`,
        included: isEnabled,
      });
      continue;
    }
    lines.push({ label: feature.label, included: isEnabled });
  }

  return lines;
};

type PlanComparisonCardProps = {
  plan: AvailablePlan;
  hasActivePaidPlan: boolean;
  // Null when there's no active paid plan, or that plan's own card (currentPlanPrice is only
  // used to decide Upgrade vs Downgrade for every *other* card).
  currentPlanPrice: number | null;
  onBuyClick: (plan: AvailablePlan) => void;
  onUpgradeClick: (plan: AvailablePlan) => void;
  onDowngradeClick: (plan: AvailablePlan) => void;
};

export const PlanComparisonCard = ({
  plan,
  hasActivePaidPlan,
  currentPlanPrice,
  onBuyClick,
  onUpgradeClick,
  onDowngradeClick,
}: PlanComparisonCardProps) => {
  // A trial runs on a plan without paying for it, so that plan is still bought, not "current".
  const isCurrent = plan.isCurrentPlan && hasActivePaidPlan;
  // Tier level is monthly-price ordering, matching the backend's own rule.
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
        ? "Upgrade"
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle>{plan.name}</CardTitle>
        <p className="text-lg font-bold whitespace-nowrap">
          {formatVnd(plan.monthlyPriceVnd)}
          <span className="text-muted-foreground text-xs font-normal"> / month</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.description && <p className="text-muted-foreground text-sm">{plan.description}</p>}
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <Check className="text-primary size-4 shrink-0" />
            Full pipeline: designs, mockups, listings, video, ZIP export
          </li>
          {planLines(plan).map((line) => (
            <li
              key={line.label}
              className={`flex items-center gap-2 ${line.included ? "" : "text-muted-foreground line-through"}`}
            >
              {line.included ? (
                <Check className="text-primary size-4 shrink-0" />
              ) : (
                <X className="text-muted-foreground size-4 shrink-0" />
              )}
              {line.label}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrent ? "outline" : "default"}
          disabled={isCurrent || isUnavailable}
          onClick={handleClick}
        >
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
};
