"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/commons/layout/page-header";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { showToast } from "@/helpers/toast";
import { useCancelScheduledDowngrade } from "@/hooks/mutations/use-cancel-scheduled-downgrade";
import { useDowngrade } from "@/hooks/mutations/use-downgrade";
import { useStartTrial } from "@/hooks/mutations/use-start-trial";
import { ENTITLEMENTS_QUERY_KEY } from "@/hooks/queries/use-entitlements";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY, useSubscriptionOverview } from "@/hooks/queries/use-subscription-overview";
import { usePopupStore } from "@/stores/popup";
import type { AvailablePlan, BillingCycle } from "@/types/subscription";
import { formatDate } from "@/utils/format-date";
import { useQueryClient } from "@tanstack/react-query";

import { SubscriptionCheckoutModal } from "./checkout-modal/subscription-checkout-modal";
import { SubscriptionRenewModal } from "./renew-modal/subscription-renew-modal";
import { SubscriptionUpgradeModal } from "./upgrade-modal/subscription-upgrade-modal";
import { AvailablePlansSection } from "./available-plans-section";
import { CurrentPlanCard } from "./current-plan-card";
import { RecentInvoicesTable } from "./recent-invoices-table";
import { TrialOfferCard } from "./trial-offer-card";
import { UsageQuotaCards } from "./usage-quota-cards";

export const SubscriptionPageContent = () => {
  const { t, i18n } = useTranslation("common");
  const { data, isLoading, isError } = useSubscriptionOverview();
  const [checkoutPlan, setCheckoutPlan] = useState<AvailablePlan | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<AvailablePlan | null>(null);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  // Plan cards show the monthly price with the yearly one under it; checkout lets the Seller pick.
  const cycle: BillingCycle = "monthly";
  const { mutate: downgrade } = useDowngrade();
  const { mutate: cancelScheduledDowngrade, isPending: isCancellingScheduledDowngrade } =
    useCancelScheduledDowngrade();
  const { mutate: startTrial, isPending: isStartingTrial } = useStartTrial();
  const openPopup = usePopupStore((state) => state.openPopup);
  const queryClient = useQueryClient();

  const handleStartTrial = () => {
    startTrial(undefined, {
      onSuccess: (result) => {
        showToast("success", t("subscription.trialOnUntil", { planName: result.planName, date: formatDate(result.trialEndsAt, i18n.language) }));
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_QUERY_KEY });
      },
    });
  };

  const handleDowngradeClick = (plan: AvailablePlan) => {
    openPopup({
      title: t("subscription.downgradeTitle", { name: plan.name }),
      description: t("subscription.downgradeDescription"),
      positiveLabel: t("subscription.scheduleDowngrade"),
      onPositive: () => {
        downgrade(plan.planId, {
          onSuccess: (result) => {
            showToast(
              "success",
              t("subscription.scheduledToast", { name: result.targetPlanName, date: formatDate(result.effectiveDate, i18n.language) })
            );
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
          },
        });
      },
    });
  };

  const handleCancelScheduledDowngrade = () => {
    openPopup({
      title: t("subscription.cancelDowngradeTitle"),
      description: t("subscription.cancelDowngradeDescription"),
      positiveLabel: t("subscription.cancelDowngradeLabel"),
      onPositive: () => {
        cancelScheduledDowngrade(undefined, {
          onSuccess: () => {
            showToast("success", t("subscription.downgradeCancelledToast"));
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
          },
        });
      },
    });
  };

  if (isLoading) {
    return <PageLoading label={t("subscription.loading")} />;
  }

  if (isError || !data) {
    return null;
  }

  return (
    // The bottom padding keeps the last line clear of the floating assistant button.
    <div className="w-full min-w-0 space-y-8 max-md:space-y-4 max-md:pb-14 md:p-6">
      <PageHeader
        title={
          <>
            Billing<span className="max-md:hidden"> &amp; Subscription</span>
          </>
        }
        description={t("subscription.pageDescription")}
      />

      {/* On Free there's nothing to show here; a plan or trial keeps it for renewal and scheduled changes. */}
      {data.currentSubscription && (
        <CurrentPlanCard
          subscription={data.currentSubscription}
          onCancelScheduledDowngrade={handleCancelScheduledDowngrade}
          isCancellingScheduledDowngrade={isCancellingScheduledDowngrade}
          onRenewClick={() => setIsRenewOpen(true)}
        />
      )}

      <UsageQuotaCards quotas={data.usageQuotas} />

      <AvailablePlansSection
        plans={data.availablePlans}
        hasActivePaidPlan={data.hasActivePaidPlan}
        cycle={cycle}
        onBuyClick={setCheckoutPlan}
        onUpgradeClick={setUpgradePlan}
        onDowngradeClick={handleDowngradeClick}
        trialLabel={t("subscription.trialTitle", { planName: data.trialPlanName ?? "Pro" })}
        trialOffer={
          data.trialEligible && (
            <TrialOfferCard
              trialDays={data.trialDays}
              planName={data.trialPlanName ?? "Pro"}
              allowances={data.trialAllowances ?? []}
              isStarting={isStartingTrial}
              onStart={handleStartTrial}
            />
          )
        }
      />

      <RecentInvoicesTable invoices={data.recentInvoices} />

      <SubscriptionCheckoutModal plan={checkoutPlan} initialCycle={cycle} onClose={() => setCheckoutPlan(null)} />
      <SubscriptionUpgradeModal plan={upgradePlan} onClose={() => setUpgradePlan(null)} />
      <SubscriptionRenewModal
        subscription={data.currentSubscription}
        open={isRenewOpen}
        onClose={() => setIsRenewOpen(false)}
      />
    </div>
  );
};
