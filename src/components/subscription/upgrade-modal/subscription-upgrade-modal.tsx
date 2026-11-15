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
import { useUpgrade } from "@/hooks/mutations/use-upgrade";
import { useCheckoutStatus } from "@/hooks/queries/use-checkout-status";
import { SUBSCRIPTION_OVERVIEW_QUERY_KEY } from "@/hooks/queries/use-subscription-overview";
import type { AvailablePlan, UpgradeResult } from "@/types/subscription";
import { formatVnd } from "@/utils/format-currency";
import { useQueryClient } from "@tanstack/react-query";

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

type UpgradeStep = "confirm" | "paying" | "done";

type SubscriptionUpgradeModalProps = {
  plan: AvailablePlan | null;
  onClose: () => void;
};

// Unlike Buy, an Upgrade always resolves in one call: the backend either applies it
// immediately (credit fully covers the difference) or hands back a PayOS QR for the remainder.
// Confirming re-fires the same mutation is avoided by gating on step, same as the checkout modal.
export const SubscriptionUpgradeModal = ({ plan, onClose }: SubscriptionUpgradeModalProps) => {
  const [step, setStep] = useState<UpgradeStep>("confirm");
  const [result, setResult] = useState<UpgradeResult | null>(null);
  const { t } = useTranslation("common");
  const { mutate: upgrade, isPending, isError, error, reset: resetUpgrade } = useUpgrade();
  const { data: status } = useCheckoutStatus(step === "paying" ? (result?.invoiceId ?? null) : null);
  const queryClient = useQueryClient();
  const hasResolvedRef = useRef(false);

  const resetState = () => {
    setStep("confirm");
    setResult(null);
    hasResolvedRef.current = false;
    resetUpgrade();
  };

  useEffect(() => {
    if (!status || status.status !== "paid" || hasResolvedRef.current) {
      return;
    }
    hasResolvedRef.current = true;
    showToast("success", t("subscription.nowActiveToast", { name: status.planName }));
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
    setStep("done");
  }, [status, queryClient, t]);

  // Refreshes Recent Invoices / Current Plan so the cancelled invoice doesn't keep showing
  // "pending" until the next manual page reload.
  const cancelOutstandingCheckout = () => {
    if (result) {
      cancelCheckoutRequest(result.invoiceId)
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
    if (step === "paying") {
      cancelOutstandingCheckout();
    }
    onClose();
    resetState();
  };

  const handleConfirm = () => {
    if (!plan) {
      return;
    }
    upgrade(plan.planId, {
      onSuccess: (upgradeResult) => {
        setResult(upgradeResult);
        queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_OVERVIEW_QUERY_KEY });
        if (upgradeResult.paymentRequired) {
          setStep("paying");
        } else {
          showToast("success", t("subscription.upgradedNoPaymentToast", { name: plan.name }));
          setStep("done");
        }
      },
    });
  };

  const handleCancelPayment = () => {
    cancelOutstandingCheckout();
    showToast("info", t("subscription.paymentCancelled"));
    onClose();
    resetState();
  };

  if (!plan) {
    return null;
  }

  return (
    <Dialog open={Boolean(plan)} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {t("subscription.upgradeEyebrow")}
          </p>
          <DialogTitle>
            {step === "paying" ? t("subscription.scanToPayDifference") : t("subscription.upgradeTo", { name: plan.name })}
          </DialogTitle>
          <DialogDescription>
            {step === "confirm" && t("subscription.upgradeDescription")}
            {step === "paying" && t("subscription.upgradePayingDescription")}
            {step === "done" && t("subscription.upgradeWorkspaceUpdated")}
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-muted flex items-center justify-between rounded-lg p-4 text-sm">
              <span className="text-muted-foreground">{t("subscription.upgradeNewPlan")}</span>
              <span className="font-semibold">
                {plan.name} — {formatVnd(plan.monthlyPriceVnd)}{t("subscription.perMonthText")}
              </span>
            </div>
            {isError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {getErrorMessage(error, t("subscription.upgradeError"))}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={isPending}>
                {t("subscription.notNow")}
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending && <Spinner className="size-4" />}
                {t("subscription.confirmUpgrade")}
              </Button>
            </div>
          </div>
        )}

        {step === "paying" && result && (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="bg-muted grid w-full grid-cols-2 divide-x rounded-lg text-sm">
              <div className="space-y-0.5 px-4 py-3">
                <p className="text-muted-foreground text-xs">{t("subscription.proratedCredit")}</p>
                <p className="font-semibold">{formatVnd(result.proratedCreditVnd)}</p>
              </div>
              <div className="space-y-0.5 px-4 py-3">
                <p className="text-muted-foreground text-xs">{t("subscription.dueToday")}</p>
                <p className="font-semibold">{formatVnd(result.dueTodayVnd)}</p>
              </div>
            </div>
            {result.qrCode && (
              <div className="rounded-lg border p-4">
                <QRCodeSVG value={result.qrCode} size={200} />
              </div>
            )}
            {result.amountVnd !== null && <p className="text-lg font-semibold">{formatVnd(result.amountVnd)}</p>}
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Spinner className="size-4" />
              {t("subscription.waitingForPayment")}
            </div>
            <Button variant="destructive" onClick={handleCancelPayment}>
              {t("subscription.cancelPayment")}
            </Button>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="text-primary size-12" />
            <div>
              <p className="text-lg font-semibold">{t("subscription.workspaceUpdated")}</p>
              <p className="text-muted-foreground text-sm">
                {plan.name} {t("subscription.nowActive")}{result ? t("subscription.renewsOn", { date: formatDate(result.firstRenewalDate) }) : null}
              </p>
            </div>
            <Button onClick={onClose}>{t("subscription.done")}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
