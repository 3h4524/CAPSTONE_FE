"use client";

import { useState } from "react";

import { PageLoading } from "@/components/commons/layout/page-loading";
import { showToast } from "@/helpers/toast";
import { useCancelScheduledDowngrade } from "@/hooks/mutations/use-cancel-scheduled-downgrade";
import { useDowngrade } from "@/hooks/mutations/use-downgrade";
import { useStartTrial } from "@/hooks/mutations/use-start-trial";
import { ENTITLEMENTS_QUERY_KEY } from "@/hooks/queries/use-entitlements";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY, useSubscriptionOverview } from "@/hooks/queries/use-subscription-overview";
import { usePopupStore } from "@/stores/popup";
import type { AvailablePlan } from "@/types/subscription";
import { useQueryClient } from "@tanstack/react-query";

import { SubscriptionCheckoutModal } from "./checkout-modal/subscription-checkout-modal";
import { SubscriptionRenewModal } from "./renew-modal/subscription-renew-modal";
import { SubscriptionUpgradeModal } from "./upgrade-modal/subscription-upgrade-modal";
import { AllowanceCard } from "./allowance-card";
import { AvailablePlansSection } from "./available-plans-section";
import { CurrentPlanCard } from "./current-plan-card";
import { RecentInvoicesTable } from "./recent-invoices-table";
import { TrialOfferCard } from "./trial-offer-card";
import { UsageQuotaCards } from "./usage-quota-cards";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export const SubscriptionPageContent = () => {
  const { data, isLoading, isError } = useSubscriptionOverview();
  const [checkoutPlan, setCheckoutPlan] = useState<AvailablePlan | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<AvailablePlan | null>(null);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const { mutate: downgrade } = useDowngrade();
  const { mutate: cancelScheduledDowngrade, isPending: isCancellingScheduledDowngrade } =
    useCancelScheduledDowngrade();
  const { mutate: startTrial, isPending: isStartingTrial } = useStartTrial();
  const openPopup = usePopupStore((state) => state.openPopup);
  const queryClient = useQueryClient();

  const handleStartTrial = () => {
    startTrial(undefined, {
      onSuccess: (result) => {
        showToast("success", `Your ${result.planName} trial is on until ${formatDate(result.trialEndsAt)}.`);
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_QUERY_KEY });
      },
    });
  };

  const handleDowngradeClick = (plan: AvailablePlan) => {
    openPopup({
      title: `Downgrade to ${plan.name}?`,
      description:
        "Your current plan stays active until the end of this billing cycle. Your next renewal is then billed at the new plan.",
      positiveLabel: "Schedule downgrade",
      onPositive: () => {
        downgrade(plan.planId, {
          onSuccess: (result) => {
            showToast(
              "success",
              `Scheduled: moving to ${result.targetPlanName} on ${formatDate(result.effectiveDate)}.`
            );
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
          },
        });
      },
    });
  };

  const handleCancelScheduledDowngrade = () => {
    openPopup({
      title: "Cancel scheduled downgrade?",
      description: "You'll stay on your current plan at renewal instead.",
      positiveLabel: "Cancel downgrade",
      onPositive: () => {
        cancelScheduledDowngrade(undefined, {
          onSuccess: () => {
            showToast("success", "Scheduled downgrade cancelled.");
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
          },
        });
      },
    });
  };

  if (isLoading) {
    return <PageLoading label="Loading subscription" />;
  }

  if (isError || !data) {
    return null;
  }

  return (
    <div className="w-full min-w-0 space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground text-sm">
          Review your current plan and choose the features that fit your shop.
        </p>
      </div>

      <CurrentPlanCard
        subscription={data.currentSubscription}
        onCancelScheduledDowngrade={handleCancelScheduledDowngrade}
        isCancellingScheduledDowngrade={isCancellingScheduledDowngrade}
        onRenewClick={() => setIsRenewOpen(true)}
      />

      {data.trialEligible && (
        <TrialOfferCard trialDays={data.trialDays} isStarting={isStartingTrial} onStart={handleStartTrial} />
      )}

      <AllowanceCard />

      <UsageQuotaCards quotas={data.usageQuotas} />

      <AvailablePlansSection
        plans={data.availablePlans}
        hasActivePaidPlan={data.hasActivePaidPlan}
        onBuyClick={setCheckoutPlan}
        onUpgradeClick={setUpgradePlan}
        onDowngradeClick={handleDowngradeClick}
      />

      <RecentInvoicesTable invoices={data.recentInvoices} />

      <SubscriptionCheckoutModal plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} />
      <SubscriptionUpgradeModal plan={upgradePlan} onClose={() => setUpgradePlan(null)} />
      <SubscriptionRenewModal
        subscription={data.currentSubscription}
        open={isRenewOpen}
        onClose={() => setIsRenewOpen(false)}
      />
    </div>
  );
};
