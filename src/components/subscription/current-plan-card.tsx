"use client";

import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CurrentSubscription } from "@/types/subscription";
import { formatVnd } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole days left, rounded up, so a trial ending later today still shows "1 day left".
export const trialDaysLeft = (trialEndsAt: string, now: number = Date.now()) =>
  Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now) / MS_PER_DAY));

type CurrentPlanCardProps = {
  subscription: CurrentSubscription | null;
  onCancelScheduledDowngrade: () => void;
  isCancellingScheduledDowngrade: boolean;
  onRenewClick: () => void;
};

export const CurrentPlanCard = ({
  subscription,
  onCancelScheduledDowngrade,
  isCancellingScheduledDowngrade,
  onRenewClick,
}: CurrentPlanCardProps) => {
  const { t, i18n } = useTranslation("common");
  const isTrial = subscription?.isTrial === true && subscription.trialEndsAt !== null;
  const daysLeft = isTrial ? trialDaysLeft(subscription.trialEndsAt!) : 0;
  const isPastDue = subscription?.status === "past_due";

  return (
    <Card className="max-md:py-4">
      <CardContent className="flex flex-col justify-between gap-4 max-md:gap-3 max-md:px-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t("subscription.currentPlan")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">
              {subscription ? subscription.planName : t("subscription.free")}
            </h3>
            {isTrial ? (
              <Badge variant="secondary">
                {t("subscription.trialBadge", { count: daysLeft })}
              </Badge>
            ) : isPastDue ? (
              <Badge variant="destructive">{t("subscription.paymentDue")}</Badge>
            ) : (
              <Badge variant={subscription?.status === "active" ? "default" : "outline"}>
                {subscription ? subscription.status : t("subscription.noPlan")}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm max-md:hidden">
            {isTrial
              ? t("subscription.trialDescription", { planName: subscription!.planName, date: formatDate(subscription!.trialEndsAt!, i18n.language) })
              : subscription
                ? subscription.shortDescription
                : t("subscription.freeDescription")}
          </p>
          {isPastDue && subscription!.lastGraceDay && (
            <div
              role="alert"
              className="border-destructive/40 bg-destructive/10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {t("subscription.renewalPastDueBefore", { date: formatDate(subscription!.renewalDate, i18n.language) })}
                <strong>{formatDate(subscription!.lastGraceDay, i18n.language)}</strong>
                {t("subscription.renewalPastDueAfter", { planName: subscription!.planName })}
              </span>
              <Button size="sm" onClick={onRenewClick}>
                {t("subscription.renewNow")}
              </Button>
            </div>
          )}
          {subscription?.scheduledPlanName && subscription.scheduledPlanEffectiveDate && (
            <div className="border-warning bg-warning/10 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span>
                {t("subscription.scheduledMovingBefore")}
                <strong>{subscription.scheduledPlanName}</strong>
                {t("subscription.scheduledMovingAfter", { date: formatDate(subscription.scheduledPlanEffectiveDate, i18n.language) })}
              </span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={onCancelScheduledDowngrade}
                disabled={isCancellingScheduledDowngrade}
              >
                {t("subscription.cancel")}
              </Button>
            </div>
          )}
        </div>
        <div className="text-right max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-3 max-md:text-left">
          <p className="text-2xl font-bold max-md:text-lg">
            {isTrial ? t("subscription.freeTrialPrice") : subscription ? formatVnd(subscription.priceVnd) : "0 ₫"}
            {!isTrial && (
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                / {subscription?.billingCycle === "annual" ? t("subscription.year") : t("subscription.month")}
              </span>
            )}
          </p>
          <p className="text-muted-foreground text-sm">
            {isTrial
              ? t("subscription.endsOn", { date: formatDate(subscription!.trialEndsAt!, i18n.language) })
              : isPastDue
                ? t("subscription.wasDueOn", { date: formatDate(subscription!.renewalDate, i18n.language) })
                : subscription
                  ? t("subscription.paidUntil", { date: formatDate(subscription.renewalDate, i18n.language) })
                  : t("subscription.noPlanYet")}
          </p>
          {subscription?.canRenew && !isPastDue && (
            <Button variant="outline" size="sm" className="mt-2 max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 max-md:mt-0" onClick={onRenewClick}>
              {t("subscription.renewNow")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
