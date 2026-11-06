"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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
    showToast("success", `${status.planName} is renewed.`);
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_QUERY_KEY });
    setPaidStatus(status);
    setStep("done");
  }, [status, queryClient]);

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
  const cycle = subscription.billingCycle === "annual" ? "year" : "month";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Renew Subscription
          </p>
          <DialogTitle>{step === "paying" ? "Scan to pay" : `Renew ${planName}`}</DialogTitle>
          <DialogDescription>
            {step === "confirm" &&
              (isPastDue && subscription.lastGraceDay
                ? `Your renewal was due ${formatDate(subscription.renewalDate)}. Pay by ${formatDate(subscription.lastGraceDay)} to keep your plan.`
                : `Pay the next ${cycle} now. It starts on ${formatDate(subscription.renewalDate)}, so you lose no days.`)}
            {step === "paying" && "Your plan is renewed once the payment is confirmed."}
            {step === "done" && "Your subscription has been renewed."}
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-muted space-y-1 rounded-lg p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold">{planName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {formatVnd(subscription.renewalPriceVnd ?? subscription.priceVnd)} / {cycle}
                </span>
              </div>
            </div>
            {isChangingPlan && (
              <p className="text-muted-foreground text-xs">
                Your scheduled move from {subscription.planName} to {planName} takes effect with
                this payment.
              </p>
            )}
            {isError && (
              <p className="text-sm text-red-600" role="alert">
                {getErrorMessage(error, "Could not start the renewal. Please try again.")}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close} disabled={isPending}>
                Not now
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending && <Spinner className="size-4" />}
                Continue to payment
              </Button>
            </div>
          </div>
        )}

        {step === "paying" && checkout && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            {status?.status === "cancelled" || status?.status === "failed" ? (
              <>
                <p className="text-sm text-red-600" role="alert">
                  The payment was not completed. Your plan was not renewed.
                </p>
                <Button variant="ghost" onClick={close}>
                  Close
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
                  Waiting for payment...
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    showToast("info", "Payment cancelled.");
                    close();
                  }}
                >
                  Cancel payment
                </Button>
              </>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="text-primary size-12" />
            <div>
              <p className="text-lg font-semibold">Plan renewed</p>
              <p className="text-muted-foreground text-sm">
                {paidStatus?.planName ?? planName} is active
                {paidStatus?.renewalDate ? ` until ${formatDate(paidStatus.renewalDate)}` : ""}.
              </p>
            </div>
            <Button onClick={close}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
