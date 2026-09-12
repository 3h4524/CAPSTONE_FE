"use client";

import { useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { useSubscriptionOverview } from "@/hooks/queries/use-subscription-overview";
import type { AvailablePlan } from "@/types/subscription";

import { SubscriptionCheckoutModal } from "./checkout-modal/subscription-checkout-modal";
import { AvailablePlansSection } from "./available-plans-section";
import { CurrentPlanCard } from "./current-plan-card";
import { RecentInvoicesTable } from "./recent-invoices-table";
import { UsageQuotaCards } from "./usage-quota-cards";

export const SubscriptionPageContent = () => {
  const { data, isLoading, isError } = useSubscriptionOverview();
  const [checkoutPlan, setCheckoutPlan] = useState<AvailablePlan | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground text-sm">
          Review your current plan and choose the capacity that fits your shop.
        </p>
      </div>

      <CurrentPlanCard subscription={data.currentSubscription} />

      <UsageQuotaCards quotas={data.usageQuotas} />

      <AvailablePlansSection
        plans={data.availablePlans}
        hasActivePaidPlan={data.hasActivePaidPlan}
        onBuyClick={setCheckoutPlan}
      />

      <RecentInvoicesTable invoices={data.recentInvoices} />

      <SubscriptionCheckoutModal plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} />
    </div>
  );
};
