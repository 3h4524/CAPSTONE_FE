"use client";

import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/helpers/error-message";
import { showToast } from "@/helpers/toast";
import { useCheckoutStatus } from "@/hooks/queries/use-checkout-status";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY } from "@/hooks/queries/use-subscription-overview";
import type { CheckoutStatus, PendingCheckout } from "@/types/subscription";
import { useQueryClient } from "@tanstack/react-query";

const formatVnd = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

type CheckoutStepPaymentProps = {
  pendingCheckout: PendingCheckout | null;
  isCreatingCheckout: boolean;
  isError: boolean;
  error: unknown;
  onBack: () => void;
  onCancelPayment: () => void;
  onSuccess: (status: CheckoutStatus) => void;
};

// PayOS has no "saved card" concept (it's pay-per-transaction via bank transfer/QR), so this step
// has no method-selection form — it just shows the QR the parent modal already requested and
// polls for confirmation. Creating/cancelling the checkout is the parent's job (see
// subscription-checkout-modal.tsx) so that Back can return to Review without losing the QR.
export const CheckoutStepPayment = ({
  pendingCheckout,
  isCreatingCheckout,
  isError,
  error,
  onBack,
  onCancelPayment,
  onSuccess,
}: CheckoutStepPaymentProps) => {
  const queryClient = useQueryClient();
  const invoiceId = pendingCheckout?.invoiceId ?? null;
  const { data: status } = useCheckoutStatus(invoiceId);
  const hasResolvedRef = useRef(false);

  useEffect(() => {
    if (!status || status.status !== "paid" || hasResolvedRef.current) {
      return;
    }
    hasResolvedRef.current = true;

    showToast(
      "success",
      "Your subscription has been activated. The new plan limits take effect immediately."
    );
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
    onSuccess(status);
  }, [status, onSuccess, queryClient]);

  if (isError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600" role="alert">
          {getErrorMessage(error, "Could not start the payment. Please try again.")}
        </p>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (isCreatingCheckout || !pendingCheckout) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (status && status.status === "failed") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600" role="alert">
          Payment could not be completed. Please check your payment method and try again.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <p className="text-sm font-medium">Scan with your banking app</p>
      <div className="rounded-lg border p-4">
        <QRCodeSVG value={pendingCheckout.qrCode} size={220} />
      </div>
      <p className="text-lg font-semibold">{formatVnd(pendingCheckout.amountVnd)}</p>
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner className="size-4" />
        Waiting for payment...
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="destructive" onClick={onCancelPayment}>
          Cancel payment
        </Button>
      </div>
    </div>
  );
};
