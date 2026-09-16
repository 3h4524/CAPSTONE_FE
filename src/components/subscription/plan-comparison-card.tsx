import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { AvailablePlan } from "@/types/subscription";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

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
  // BR107/BR113: tier level is monthly-price ordering, matching the backend's own rule.
  const isHigherTier = currentPlanPrice !== null && plan.monthlyPriceUsd > currentPlanPrice;
  const isLowerTier = currentPlanPrice !== null && plan.monthlyPriceUsd < currentPlanPrice;
  // Same price as the current plan but a different plan — neither Upgrade nor Downgrade applies,
  // and Buy is rejected server-side while a paid plan is active. Shouldn't happen with real
  // pricing, but disable rather than guess.
  const isUnavailable = hasActivePaidPlan && !plan.isCurrentPlan && !isHigherTier && !isLowerTier;

  const ctaLabel = plan.isCurrentPlan
    ? "Current plan"
    : !hasActivePaidPlan
      ? `Buy ${plan.name}`
      : isHigherTier
        ? "Upgrade"
        : isLowerTier
          ? "Downgrade"
          : "Unavailable";

  const handleClick = () => {
    if (plan.isCurrentPlan || isUnavailable) {
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
          {formatCurrency(plan.monthlyPriceUsd)}
          <span className="text-muted-foreground text-xs font-normal">/mo</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.description && <p className="text-muted-foreground text-sm">{plan.description}</p>}
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <Check className="text-primary size-4 shrink-0" />
            {plan.quotas.imageGenerationQuota.toLocaleString()} images/month
          </li>
          <li className="flex items-center gap-2">
            <Check className="text-primary size-4 shrink-0" />
            {plan.quotas.apiCallQuota.toLocaleString()} API calls/month
          </li>
          <li className="flex items-center gap-2">
            <Check className="text-primary size-4 shrink-0" />
            {plan.quotas.storageQuotaGb.toLocaleString()} GB storage
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={plan.isCurrentPlan ? "outline" : "default"}
          disabled={plan.isCurrentPlan || isUnavailable}
          onClick={handleClick}
        >
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
};
