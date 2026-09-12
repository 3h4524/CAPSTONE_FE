import { showToast } from "@/helpers/toast";
import type { AvailablePlan } from "@/types/subscription";

import { PlanComparisonCard } from "./plan-comparison-card";

type AvailablePlansSectionProps = {
  plans: AvailablePlan[];
  hasActivePaidPlan: boolean;
  onBuyClick: (plan: AvailablePlan) => void;
};

export const AvailablePlansSection = ({ plans, hasActivePaidPlan, onBuyClick }: AvailablePlansSectionProps) => {
  const handleUnavailableClick = () => {
    // MSG57 verbatim.
    showToast("info", "You already have an active paid plan. Please use Upgrade or Downgrade instead.");
  };

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
            onBuyClick={onBuyClick}
            onUnavailableClick={handleUnavailableClick}
          />
        ))}
      </div>
    </section>
  );
};
