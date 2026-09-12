"use client";

import { useEffect, useRef, useState } from "react";

import { cancelCheckoutRequest } from "@/api/subscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/helpers/toast";
import { useCheckout } from "@/hooks/mutations/use-checkout";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY } from "@/hooks/queries/use-subscription-overview";
import type { AvailablePlan, BillingCycle, CheckoutStatus, PendingCheckout } from "@/types/subscription";
import { useQueryClient } from "@tanstack/react-query";

import { type CheckoutStep, CheckoutStepIndicator } from "./checkout-step-indicator";
import { CheckoutStepPayment } from "./checkout-step-payment";
import { CheckoutStepReady } from "./checkout-step-ready";
import { CheckoutStepReview } from "./checkout-step-review";

type SubscriptionCheckoutModalProps = {
  plan: AvailablePlan | null;
  onClose: () => void;
};

// Built on the local Dialog primitive with local step state rather than the shared
// usePopupStore confirm-dialog: that store only renders a title/description and two buttons,
// with no slot for this multi-step form.
//
// The pending PayOS checkout (once created) lives here, not inside CheckoutStepPayment, so that
// navigating Back to Review and forward again reuses the same QR instead of creating a new one on
// every visit (BR105: Back must not discard what Review/Payment already produced) — only the
// explicit "Cancel payment" button, or fully closing the modal, actually cancels it.
export const SubscriptionCheckoutModal = ({ plan, onClose }: SubscriptionCheckoutModalProps) => {
  const [step, setStep] = useState<CheckoutStep>("review");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [result, setResult] = useState<CheckoutStatus | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const { mutate: checkout, isPending: isCreatingCheckout, isError, error } = useCheckout();
  const hasRequestedRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (step !== "payment" || pendingCheckout || hasRequestedRef.current || !plan) {
      return;
    }
    hasRequestedRef.current = true;
    checkout({ planId: plan.planId, billingCycle }, { onSuccess: setPendingCheckout });
  }, [step, pendingCheckout, plan, billingCycle, checkout]);

  const resetState = () => {
    setStep("review");
    setBillingCycle("monthly");
    setResult(null);
    setPendingCheckout(null);
    hasRequestedRef.current = false;
  };

  // Fully closing the modal (X icon, clicking outside, or the explicit Cancel payment button)
  // always cancels any outstanding checkout — the backend treats this as a no-op if it already
  // resolved (paid), so this is safe to fire unconditionally. The overview query (Recent Invoices,
  // current plan) is invalidated on success so the cancelled invoice shows up without a manual
  // page reload.
  const cancelOutstandingCheckout = () => {
    if (pendingCheckout) {
      cancelCheckoutRequest(pendingCheckout.invoiceId)
        .then(() => queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY }))
        .catch(() => {
          // Best-effort: the checkout simply stays outstanding until it expires on PayOS's side.
        });
    }
  };

  const handleClose = (open: boolean) => {
    if (open) {
      return;
    }
    cancelOutstandingCheckout();
    onClose();
    resetState();
  };

  const handleCancelPayment = () => {
    cancelOutstandingCheckout();
    showToast("info", "Payment cancelled.");
    onClose();
    resetState();
  };

  if (!plan) {
    return null;
  }

  return (
    <Dialog open={Boolean(plan)} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Subscription Checkout
          </p>
          <DialogTitle>
            {step === "payment" ? "Scan to pay" : `Subscribe to ${plan.name}`}
          </DialogTitle>
          <DialogDescription>
            Your new capacity will be available immediately upon confirmation.
          </DialogDescription>
          <CheckoutStepIndicator currentStep={step} />
        </DialogHeader>

        {step === "review" && (
          <CheckoutStepReview
            plan={plan}
            billingCycle={billingCycle}
            onBillingCycleChange={setBillingCycle}
            onContinue={() => setStep("payment")}
            onCancel={onClose}
          />
        )}

        {step === "payment" && (
          <CheckoutStepPayment
            pendingCheckout={pendingCheckout}
            isCreatingCheckout={isCreatingCheckout}
            isError={isError}
            error={error}
            onBack={() => setStep("review")}
            onCancelPayment={handleCancelPayment}
            onSuccess={(checkoutResult) => {
              setResult(checkoutResult);
              setStep("ready");
            }}
          />
        )}

        {step === "ready" && result && (
          <CheckoutStepReady result={result} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
};
