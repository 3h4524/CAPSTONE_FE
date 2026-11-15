"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

import { cancelCheckoutRequest } from "@/api/subscription";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useRenew } from "@/hooks/mutations/use-renew";
import { useCheckoutStatus } from "@/hooks/queries/use-checkout-status";
import { ENTITLEMENTS_QUERY_KEY } from "@/hooks/queries/use-entitlements";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY } from "@/hooks/queries/use-subscription-overview";
import type { CheckoutStatus, CurrentSubscription, PendingCheckout } from "@/types/subscription";
import { formatVnd } from "@/utils/format-currency";
import { useQueryClient } from "@tanstack/react-query";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

type RenewStep = "confirm" | "paying" | "done";

type SubscriptionRenewModalProps = {
  subscription: CurrentSubscription | null;
  open: boolean;
  onClose: () => void;
};

// Pays the next cycle of the current plan. Nothing changes until PayOS confirms; closing or
// cancelling only voids this payment link, and a past-due plan keeps its grace period.
export const SubscriptionRenewModal = ({
  subscription,
  open,
  onClose,
}: SubscriptionRenewModalProps) => {
  const [step, setStep] = useState<RenewStep>("confirm");
  const [checkout, setCheckout] = useState<PendingCheckout | null>(null);
  const [paidStatus, setPaidStatus] = useState<CheckoutStatus | null>(null);
  const { t } = useTranslation("common");
  const { mutate: renew, isPending, isError, error, reset: resetRenew } = useRenew();
  const { data: status } = useCheckoutStatus(
    step === "paying" ? (checkout?.invoiceId ?? null) : null
  );
  const queryClient = useQueryClient();
  const hasResolvedRef = useRef(false);

  const resetState = () => {
    setStep("confirm");
    setCheckout(null);
    setPaidStatus(null);
    hasResolvedRef.current = false;
    resetRenew();
  };

  useEffect(() => {
    if (!status || status.status !== "paid" || hasResolvedRef.current) {
      return;
    }
    hasResolvedRef.current = true;
    showToast("success", t("subscription.renewedToast", { name: status.planName }));
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_QUERY_KEY });
    setPaidStatus(status);
    setStep("done");
  }, [status, queryClient, t]);

  const cancelOutstandingCheckout = () => {
    if (checkout) {
      cancelCheckoutRequest(checkout.invoiceId)
        .then(() => queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY }))
        .catch(() => {
          // Best-effort: the link simply stays outstanding until it expires on PayOS's side.
        });
    }
  };

  const close = () => {
    if (step === "paying") {
      cancelOutstandingCheckout();
    }
    onClose();
    resetState();
  };

  const handleConfirm = () => {
    renew(undefined, {
      onSuccess: (pending) => {
        setCheckout(pending);
        setStep("paying");
      },
    });
  };

  if (!subscription) {
    return null;
  }

  const planName = subscription.renewalPlanName ?? subscription.planName;
  const isPastDue = subscription.status === "past_due";
  const isChangingPlan = planName !== subscription.planName;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t("subscription.renewEyebrow")}
          </p>
          <DialogTitle>{step === "paying" ? t("subscription.scanToPay") : t("subscription.renewTitle", { name: planName })}</DialogTitle>
          <DialogDescription>
            {step === "confirm" &&
              (isPastDue && subscription.lastGraceDay
                ? t("subscription.renewPastDueDescription", { renewalDate: formatDate(subscription.renewalDate), graceDay: formatDate(subscription.lastGraceDay) })
                : t("subscription.renewUpcomingDescription", { cycle: t(subscription.billingCycle === "annual" ? "subscription.year" : "subscription.month"), date: formatDate(subscription.renewalDate) }))}
            {step === "paying" && t("subscription.renewPayingDescription")}
            {step === "done" && t("subscription.renewedDescription")}
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-muted space-y-1 rounded-lg p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("subscription.renewPlanLabel")}</span>
                <span className="font-semibold">{planName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("subscription.renewAmountLabel")}</span>
                <span className="font-semibold">
                  {formatVnd(subscription.renewalPriceVnd ?? subscription.priceVnd)} / {t(subscription.billingCycle === "annual" ? "subscription.year" : "subscription.month")}
                </span>
              </div>
            </div>
            {isChangingPlan && (
              <p className="text-muted-foreground text-xs">
                {t("subscription.renewScheduledDescription", { current: subscription.planName, target: planName })}
              </p>
            )}
            {isError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {getErrorMessage(error, t("subscription.renewError"))}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close} disabled={isPending}>
                {t("subscription.notNow")}
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending && <Spinner className="size-4" />}
                {t("subscription.continueToPayment")}
              </Button>
            </div>
          </div>
        )}

        {step === "paying" && checkout && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            {status?.status === "cancelled" || status?.status === "failed" ? (
              <>
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {t("subscription.paymentNotCompleted")}
                </p>
                <Button variant="ghost" onClick={close}>
                  {t("subscription.close")}
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-lg border p-4">
                  <QRCodeSVG value={checkout.qrCode} size={200} />
                </div>
                <p className="text-lg font-semibold">{formatVnd(checkout.amountVnd)}</p>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Spinner className="size-4" />
                  {t("subscription.waitingForPayment")}
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    showToast("info", t("subscription.paymentCancelled"));
                    close();
                  }}
                >
                  {t("subscription.cancelPayment")}
                </Button>
              </>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="text-primary size-12" />
            <div>
              <p className="text-lg font-semibold">{t("subscription.planRenewedTitle")}</p>
              <p className="text-muted-foreground text-sm">
                {paidStatus?.planName ?? planName}{" "}
                {paidStatus?.renewalDate ? t("subscription.activeUntil", { date: formatDate(paidStatus.renewalDate) }) : t("subscription.activeDot")}
              </p>
            </div>
            <Button onClick={close}>{t("subscription.done")}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
