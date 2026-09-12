import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { AvailablePlan } from "@/types/subscription";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

type PlanComparisonCardProps = {
  plan: AvailablePlan;
  hasActivePaidPlan: boolean;
  onBuyClick: (plan: AvailablePlan) => void;
  onUnavailableClick: () => void;
};

export const PlanComparisonCard = ({
  plan,
  hasActivePaidPlan,
  onBuyClick,
  onUnavailableClick,
}: PlanComparisonCardProps) => {
  const ctaLabel = plan.isCurrentPlan ? "Current plan" : hasActivePaidPlan ? "Upgrade" : `Buy ${plan.name}`;

  const handleClick = () => {
    if (plan.isCurrentPlan) {
      return;
    }
    if (hasActivePaidPlan) {
      // Upgrade/Downgrade are out of this scope; MSG57 is shown instead of opening checkout.
      onUnavailableClick();
      return;
    }
    onBuyClick(plan);
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
          disabled={plan.isCurrentPlan}
          onClick={handleClick}
        >
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
};
