import type { AvailablePlan } from "@/types/subscription";

import { PlanComparisonCard } from "./plan-comparison-card";

type AvailablePlansSectionProps = {
  plans: AvailablePlan[];
  hasActivePaidPlan: boolean;
  onBuyClick: (plan: AvailablePlan) => void;
  onUpgradeClick: (plan: AvailablePlan) => void;
  onDowngradeClick: (plan: AvailablePlan) => void;
};

export const AvailablePlansSection = ({
  plans,
  hasActivePaidPlan,
  onBuyClick,
  onUpgradeClick,
  onDowngradeClick,
}: AvailablePlansSectionProps) => {
  const currentPlanPrice = plans.find((plan) => plan.isCurrentPlan)?.monthlyPriceUsd ?? null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Available plans
          </p>
          <h2 className="text-lg font-semibold">Choose the right capacity</h2>
        </div>
        <p className="text-muted-foreground max-w-xs text-xs sm:text-right">
          All plans include the complete APCS workflow.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <PlanComparisonCard
            key={plan.planId}
            plan={plan}
            hasActivePaidPlan={hasActivePaidPlan}
            currentPlanPrice={currentPlanPrice}
            onBuyClick={onBuyClick}
            onUpgradeClick={onUpgradeClick}
            onDowngradeClick={onDowngradeClick}
          />
        ))}
      </div>
    </section>
  );
};
