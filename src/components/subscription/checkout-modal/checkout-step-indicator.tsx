import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/utils/cn";

export type CheckoutStep = "review" | "payment" | "ready";

const STEPS: { step: CheckoutStep; labelKey: "subscription.checkoutStepReview" | "subscription.checkoutStepPayment" | "subscription.checkoutStepReady"; sublabelKey: "subscription.checkoutStepReviewSublabel" | "subscription.checkoutStepPaymentSublabel" | "subscription.workspaceUpdated" }[] = [
  { step: "review", labelKey: "subscription.checkoutStepReview", sublabelKey: "subscription.checkoutStepReviewSublabel" },
  { step: "payment", labelKey: "subscription.checkoutStepPayment", sublabelKey: "subscription.checkoutStepPaymentSublabel" },
  { step: "ready", labelKey: "subscription.checkoutStepReady", sublabelKey: "subscription.workspaceUpdated" },
];

const STEP_ORDER: Record<CheckoutStep, number> = { review: 0, payment: 1, ready: 2 };

type CheckoutStepIndicatorProps = {
  currentStep: CheckoutStep;
};

export const CheckoutStepIndicator = ({ currentStep }: CheckoutStepIndicatorProps) => {
  const { t } = useTranslation("common");
  const currentIndex = STEP_ORDER[currentStep];

  return (
    <ol className="flex items-start justify-between gap-2 pt-2">
      {STEPS.map(({ step, labelKey, sublabelKey }, index) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              index < currentIndex
                ? "bg-primary text-primary-foreground"
                : index === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground border-2"
            )}
          >
            {index < currentIndex ? <Check className="size-3.5" /> : index + 1}
          </span>
          <span className="hidden text-left sm:block">
            <span
              className={cn(
                "block text-sm font-medium",
                index <= currentIndex ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {t(labelKey)}
            </span>
            <span className="text-muted-foreground block text-xs">{t(sublabelKey)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
};
