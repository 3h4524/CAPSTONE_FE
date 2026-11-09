"use client";

import { type ReactNode,useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useIsPhone } from "@/hooks/use-is-phone";
import type { AvailablePlan, BillingCycle } from "@/types/subscription";

import { PhonePlanCarousel } from "./phone-plan-carousel";
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
  // The trial's name on a phone's plan tabs.
  trialLabel?: string;
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

// Three cards span the row, lining up with the sections around them.
const THREE_ACROSS_WIDTH = "w-full sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2*1.25rem)/3)]";
const CARD_WIDTH = `${THREE_ACROSS_WIDTH} xl:w-[calc((100%-3*1.25rem)/4)]`;

export const AvailablePlansSection = ({
  plans,
  hasActivePaidPlan,
  cycle,
  onBuyClick,
  onUpgradeClick,
  onDowngradeClick,
  trialOffer,
  trialLabel = "Trial",
}: AvailablePlansSectionProps) => {
  const isPhone = useIsPhone();
  const currentPlanPrice = plans.find((plan) => plan.isCurrentPlan)?.monthlyPriceUsd ?? null;
  const emphasis = emphasisOf(plans, hasActivePaidPlan);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const cardItems = [
    ...(trialOffer ? [{ key: "trial-offer", label: trialLabel, node: trialOffer }] : []),
    ...plans.map((plan) => ({
      key: plan.planId,
      label: plan.name,
      isRecommended: emphasis.get(plan.planId) === "recommended",
      node: (
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
      ),
    })),
  ];

  const totalCards = cardItems.length;

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [totalCards]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const card = container.querySelector<HTMLElement>("[data-plan-card]");
    const cardWidth = card ? card.offsetWidth + 20 : 320;
    container.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  if (isPhone) {
    const opening = plans.find((plan) => emphasis.get(plan.planId) === "current") ?? plans.find((plan) => plan.isRecommended);
    return (
      <section aria-label="Available plans">
        <PhonePlanCarousel key={totalCards} items={cardItems} initialKey={opening?.planId} />
      </section>
    );
  }

  return (
    <section aria-label="Available plans" className="relative">
      {/* Side Arrow Navigation Buttons (located at the two ends: left of the 1st card, right of the last card) */}
      {totalCards > 4 && (
        <>
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Previous plan"
            disabled={!canScrollLeft}
            className="absolute top-1/2 -left-3 z-30 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-card text-ink-700 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-ink-50 active:scale-95 disabled:pointer-events-none disabled:opacity-25 sm:-left-5 sm:size-11"
          >
            <ChevronLeft className="size-5 stroke-[2.5] sm:size-6" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Next plan"
            disabled={!canScrollRight}
            className="absolute top-1/2 -right-3 z-30 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-card text-ink-700 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-ink-50 active:scale-95 disabled:pointer-events-none disabled:opacity-25 sm:-right-5 sm:size-11"
          >
            <ChevronRight className="size-5 stroke-[2.5] sm:size-6" />
          </button>
        </>
      )}

      {/* Plans Container */}
      {totalCards < 4 ? (
        // A card left alone on its line stays centred.
        <div className="flex flex-wrap justify-center gap-5">
          {cardItems.map(({ key, node }) => (
            <div key={key} className={totalCards === 3 ? THREE_ACROSS_WIDTH : CARD_WIDTH}>
              {node}
            </div>
          ))}
        </div>
      ) : totalCards === 4 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cardItems.map(({ key, node }) => (
            <div key={key} className="h-full">
              {node}
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pt-1 pb-4 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {cardItems.map(({ key, node }) => (
            <div
              key={key}
              data-plan-card
              className={`${CARD_WIDTH} shrink-0 snap-start`}
            >
              {node}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
