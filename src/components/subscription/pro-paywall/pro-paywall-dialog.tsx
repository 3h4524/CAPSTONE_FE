"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Lock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SubscriptionCheckoutModal } from "@/components/subscription/checkout-modal/subscription-checkout-modal";
import { SubscriptionUpgradeModal } from "@/components/subscription/upgrade-modal/subscription-upgrade-modal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SUBSCRIPTION_PATH } from "@/helpers/plan-errors";
import { showToast } from "@/helpers/toast";
import { useStartTrial } from "@/hooks/mutations/use-start-trial";
import { ENTITLEMENTS_QUERY_KEY } from "@/hooks/queries/use-entitlements";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY, useSubscriptionOverview } from "@/hooks/queries/use-subscription-overview";
import type { AvailablePlan } from "@/types/subscription";
import { formatDate } from "@/utils/format-date";
import { useQueryClient } from "@tanstack/react-query";

/** What was locked, in the words of the place the Seller clicked. */
export type ProPaywallTopic = { title: string; description: string };

type ProPaywallDialogProps = {
  topic: ProPaywallTopic | null;
  /** What Pro adds here, shown as a short list. */
  benefits: string[];
  onClose: () => void;
  /** After a trial started or a plan was bought, for the page to read what it opens again. */
  onUnlocked?: () => void;
};

/**
 * Offers Pro where a Seller met a locked feature: what it adds and its price, then the way in that fits them. A Seller
 * who never had a trial starts one; one on Free buys Pro, and one on another paid plan upgrades, in the same modals the
 * Subscription page uses, without leaving the page.
 */
export const ProPaywallDialog = ({ topic, benefits, onClose, onUnlocked }: ProPaywallDialogProps) => {
  const { t, i18n } = useTranslation("common");
  const queryClient = useQueryClient();
  const { data: overview } = useSubscriptionOverview();
  const { mutate: startTrial, isPending: isStartingTrial } = useStartTrial();
  const [checkoutPlan, setCheckoutPlan] = useState<AvailablePlan | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<AvailablePlan | null>(null);
  const plans = overview?.availablePlans ?? [];
  const pro = plans.find((plan) => plan.tier === "pro") ?? plans.find((plan) => plan.isRecommended);

  const unlocked = () => {
    void queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
    onUnlocked?.();
  };

  const tryPro = () => startTrial(undefined, {
    onSuccess: (result) => {
      showToast("success", t("subscription.trialOnUntil", { planName: result.planName, date: formatDate(result.trialEndsAt, i18n.language) }));
      unlocked();
      onClose();
    },
  });

  const buyPro = () => {
    if (!pro) return;
    if (overview?.hasActivePaidPlan) setUpgradePlan(pro);
    else setCheckoutPlan(pro);
  };

  // The payment modals take over the screen; the offer closes behind them and they close the whole flow.
  const finishPayment = () => {
    setCheckoutPlan(null);
    setUpgradePlan(null);
    unlocked();
    onClose();
  };

  return (
    <>
      <Dialog open={topic !== null && !checkoutPlan && !upgradePlan} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Lock className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>{topic?.title}</DialogTitle>
            <DialogDescription>{topic?.description}</DialogDescription>
          </DialogHeader>
          {benefits.length > 0 && (
            <ul className="space-y-2 text-sm">
              {benefits.map((benefit) => (
                <li key={benefit} className="text-ink-700 flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
          )}
          {pro && (
            <p className="text-ink-500 text-sm">
              {t("proPaywall.price", { defaultValue: "{{name}} from ${{price}} a month.", name: pro.name, price: pro.monthlyPriceUsd })}
            </p>
          )}
          <div className="flex flex-col gap-2 pt-1">
            {overview?.trialEligible && (
              <Button type="button" variant="primaryBlue" disabled={isStartingTrial} onClick={tryPro}>
                <Sparkles className="size-4" />
                {t("proPaywall.tryFree", { defaultValue: "Try {{name}} free for {{days}} days", name: overview.trialPlanName ?? "Pro", days: overview.trialDays })}
              </Button>
            )}
            {pro ? (
              <Button type="button" variant={overview?.trialEligible ? "outline" : "primaryBlue"} onClick={buyPro}>
                {overview?.hasActivePaidPlan
                  ? t("proPaywall.upgrade", { defaultValue: "Upgrade to {{name}}", name: pro.name })
                  : t("proPaywall.buy", { defaultValue: "Get {{name}}", name: pro.name })}
              </Button>
            ) : (
              <Button asChild variant="primaryBlue"><Link href={SUBSCRIPTION_PATH}>{t("proPaywall.seePlans", { defaultValue: "See plans" })}</Link></Button>
            )}
            <Link href={SUBSCRIPTION_PATH} className="text-ink-500 hover:text-ink-800 text-center text-xs underline-offset-2 hover:underline">
              {t("proPaywall.allPlans", { defaultValue: "Compare all plans" })}
            </Link>
          </div>
        </DialogContent>
      </Dialog>
      <SubscriptionCheckoutModal plan={checkoutPlan} onClose={finishPayment} />
      <SubscriptionUpgradeModal plan={upgradePlan} onClose={finishPayment} />
    </>
  );
};
