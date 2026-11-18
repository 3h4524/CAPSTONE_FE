"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SubscriptionCheckoutModal } from "@/components/subscription/checkout-modal/subscription-checkout-modal";
import { HighlightPro, ProLockBadge } from "@/components/subscription/pro-paywall/pro-locked";
import { SubscriptionUpgradeModal } from "@/components/subscription/upgrade-modal/subscription-upgrade-modal";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SUBSCRIPTION_PATH } from "@/helpers/plan-errors";
import { showToast } from "@/helpers/toast";
import { useStartTrial } from "@/hooks/mutations/use-start-trial";
import { ENTITLEMENTS_QUERY_KEY } from "@/hooks/queries/use-entitlements";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY, useSubscriptionOverview } from "@/hooks/queries/use-subscription-overview";
import type { AvailablePlan, SubscriptionOverview } from "@/types/subscription";
import { formatDate } from "@/utils/format-date";
import { useQueryClient } from "@tanstack/react-query";

/** What was locked, in the words of the place the Seller clicked. */
export type ProPaywallTopic = { title: string; description: string };

type ProPaywallDialogProps = {
  topic: ProPaywallTopic | null;
  /** What Pro adds here, shown as a short list. */
  benefits: string[];
  /** The plan feature that opens what was locked; the plan offered is the cheapest one that has it. */
  featureCode?: string;
  onClose: () => void;
  /** After a trial started or a plan was bought, for the page to read what it opens again. */
  onUnlocked?: () => void;
};

/**
 * The plan to offer: the cheapest other plan with the feature turned on, else the seeded Pro plan by its tier or as the
 * trial plan. An Admin may rename plans and tiers, so neither the name "Pro" nor the Recommended mark is trusted alone:
 * the Recommended plan may well not open the feature.
 */
export const pickProPlan = (overview: SubscriptionOverview | undefined, featureCode?: string): AvailablePlan | null => {
  const others = (overview?.availablePlans ?? []).filter((plan) => !plan.isCurrentPlan);
  const byPrice = [...others].sort((a, b) => a.monthlyPriceUsd - b.monthlyPriceUsd);
  const withFeature = featureCode
    ? byPrice.find((plan) => plan.features?.some((feature) => feature.featureCode === featureCode && feature.isEnabled))
    : undefined;
  return withFeature
    ?? others.find((plan) => plan.tier === "pro")
    ?? others.find((plan) => overview?.trialPlanName != null && plan.name === overview.trialPlanName)
    ?? null;
};

/**
 * Offers Pro where a Seller met a locked feature: what it adds and its price, then the way in that fits them. A Seller
 * who never had a trial starts one; one on Free buys Pro, and one on another paid plan upgrades, in the same modals the
 * Subscription page uses, without leaving the page.
 */
export const ProPaywallDialog = ({ topic, benefits, featureCode, onClose, onUnlocked }: ProPaywallDialogProps) => {
  const { t, i18n } = useTranslation("common");
  const queryClient = useQueryClient();
  const { data: overview } = useSubscriptionOverview();
  const { mutate: startTrial, isPending: isStartingTrial } = useStartTrial();
  const [checkoutPlan, setCheckoutPlan] = useState<AvailablePlan | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<AvailablePlan | null>(null);
  const pro = pickProPlan(overview, featureCode);

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

  const trialFirst = Boolean(overview?.trialEligible);
  const primary = "inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-bold text-[#0b1324] shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition hover:from-amber-300 hover:to-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60";
  const secondary = "inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <>
      <Dialog open={topic !== null && !checkoutPlan && !upgradePlan} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="overflow-hidden border-white/10 bg-[#0b1324] p-0 text-white sm:max-w-lg [&>button]:text-white/70 [&>button:hover]:text-white">
          <div className="bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.18),transparent_65%)] px-6 pt-8 pb-6 text-center sm:px-8">
            <ProLockBadge className="mx-auto mb-5" />
            <DialogTitle className="text-xl font-bold text-balance text-white sm:text-2xl">
              {topic && <HighlightPro text={topic.title} />}
            </DialogTitle>
            <DialogDescription className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-pretty text-white/70">
              {topic?.description}
            </DialogDescription>
          </div>

          <div className="space-y-5 px-6 pb-7 sm:px-8">
            {benefits.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/90">
                    <Check className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
            )}

            {pro && (
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-white">{`$${pro.monthlyPriceUsd}`}</span>
                <span className="text-sm text-white/60">
                  {t("proPaywall.perMonth", { defaultValue: "/ month · {{name}} plan", name: pro.name })}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {trialFirst && (
                <button type="button" className={primary} disabled={isStartingTrial} onClick={tryPro}>
                  <Sparkles className="size-4" aria-hidden="true" />
                  {t("proPaywall.tryFree", { defaultValue: "Try {{name}} free for {{days}} days", name: overview?.trialPlanName ?? pro?.name ?? "Pro", days: overview?.trialDays })}
                </button>
              )}
              {pro ? (
                <button type="button" className={trialFirst ? secondary : primary} onClick={buyPro}>
                  {overview?.hasActivePaidPlan
                    ? t("proPaywall.upgrade", { defaultValue: "Upgrade to {{name}}", name: pro.name })
                    : t("proPaywall.buy", { defaultValue: "Get {{name}}", name: pro.name })}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <Link href={SUBSCRIPTION_PATH} className={primary}>
                  {t("proPaywall.seePlans", { defaultValue: "See plans" })}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}
              <Link href={SUBSCRIPTION_PATH} className="text-center text-xs text-white/60 underline-offset-2 hover:text-white hover:underline">
                {t("proPaywall.allPlans", { defaultValue: "Compare all plans" })}
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <SubscriptionCheckoutModal plan={checkoutPlan} onClose={finishPayment} />
      <SubscriptionUpgradeModal plan={upgradePlan} onClose={finishPayment} />
    </>
  );
};
