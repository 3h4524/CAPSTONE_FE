import type { ReactNode } from "react";

import type { AvailablePlan, BillingCycle } from "@/types/subscription";

import { PlanComparisonCard, type PlanEmphasis } from "./plan-comparison-card";

type AvailablePlansSectionProps = {
  plans: AvailablePlan[];
  hasActivePaidPlan: boolean;
  cycle: BillingCycle;
  onBuyClick: (plan: AvailablePlan) => void;
  onUpgradeClick: (plan: AvailablePlan) => void;
  onDowngradeClick: (plan: AvailablePlan) => void;
  // The free trial card, shown first in the same row as the plans.
  trialOffer?: ReactNode;
};

// The plan in effect is marked current; the one an Admin marked Recommended is shown dark.
const emphasisOf = (plans: AvailablePlan[], hasActivePaidPlan: boolean): Map<string, PlanEmphasis> => {
  const current = hasActivePaidPlan ? plans.find((plan) => plan.isCurrentPlan) : undefined;
  return new Map(
    plans.map((plan) => [plan.planId, plan === current ? "current" : plan.isRecommended ? "recommended" : "none"])
  );
};

// The plan priced just below this one, whose features this one's card takes as given.
const nextCheaper = (plans: AvailablePlan[], plan: AvailablePlan) =>
  plans
    .filter((other) => other.monthlyPriceUsd < plan.monthlyPriceUsd)
    .sort((a, b) => b.monthlyPriceUsd - a.monthlyPriceUsd)[0];

export const AvailablePlansSection = ({
  plans,
  hasActivePaidPlan,
  cycle,
  onBuyClick,
  onUpgradeClick,
  onDowngradeClick,
  trialOffer,
}: AvailablePlansSectionProps) => {
  const currentPlanPrice = plans.find((plan) => plan.isCurrentPlan)?.monthlyPriceUsd ?? null;
  const emphasis = emphasisOf(plans, hasActivePaidPlan);
  const cardCount = plans.length + (trialOffer ? 1 : 0);

  return (
    <section aria-label="Available plans">
      <div className={`grid gap-5 ${cardCount >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
        {trialOffer}
        {plans.map((plan) => (
          <PlanComparisonCard
            key={plan.planId}
            plan={plan}
            hasActivePaidPlan={hasActivePaidPlan}
            currentPlanPrice={currentPlanPrice}
            cycle={cycle}
            emphasis={emphasis.get(plan.planId) ?? "none"}
            basePlan={nextCheaper(plans, plan)}
            onBuyClick={onBuyClick}
            onUpgradeClick={onUpgradeClick}
            onDowngradeClick={onDowngradeClick}
          />
        ))}
      </div>
    </section>
  );
};
