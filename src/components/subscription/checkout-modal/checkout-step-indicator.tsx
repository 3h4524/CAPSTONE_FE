import { Check } from "lucide-react";

import { cn } from "@/utils/cn";

export type CheckoutStep = "review" | "payment" | "ready";

const STEPS: { step: CheckoutStep; label: string; sublabel: string }[] = [
  { step: "review", label: "Review", sublabel: "Plan details" },
  { step: "payment", label: "Payment", sublabel: "Confirm method" },
  { step: "ready", label: "Ready", sublabel: "Workspace updated" },
];

const STEP_ORDER: Record<CheckoutStep, number> = { review: 0, payment: 1, ready: 2 };

type CheckoutStepIndicatorProps = {
  currentStep: CheckoutStep;
};

export const CheckoutStepIndicator = ({ currentStep }: CheckoutStepIndicatorProps) => {
  const currentIndex = STEP_ORDER[currentStep];

  return (
    <ol className="flex items-start justify-between gap-2 pt-2">
      {STEPS.map(({ step, label, sublabel }, index) => (
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
              {label}
            </span>
            <span className="text-muted-foreground block text-xs">{sublabel}</span>
          </span>
        </li>
      ))}
    </ol>
  );
};
