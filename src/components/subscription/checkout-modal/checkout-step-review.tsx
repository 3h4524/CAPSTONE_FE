import { ArrowRight, Check, Sparkles } from "lucide-react";

import { planLines } from "@/components/subscription/plan-comparison-card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AvailablePlan, BillingCycle } from "@/types/subscription";
import { formatVnd } from "@/utils/format-currency";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const addYears = (date: Date, years: number) => {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
};

type CheckoutStepReviewProps = {
  plan: AvailablePlan;
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  onContinue: () => void;
  onCancel: () => void;
};

export const CheckoutStepReview = ({
  plan,
  billingCycle,
  onBillingCycleChange,
  onContinue,
  onCancel,
}: CheckoutStepReviewProps) => {
  const today = new Date();
  // BR191: a plan with no annual price must never offer the Annual option.
  const canChooseAnnual = plan.annualPriceUsd !== null;
  const dueToday = billingCycle === "annual" && plan.annualPriceVnd !== null
    ? plan.annualPriceVnd
    : plan.monthlyPriceVnd;
  const firstRenewal = billingCycle === "annual" ? addYears(today, 1) : addMonths(today, 1);
  const monthlyRate =
    billingCycle === "annual" && plan.annualPriceVnd !== null
      ? Math.round(plan.annualPriceVnd / 12)
      : plan.monthlyPriceVnd;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Selected plan</p>
              <p className="text-lg font-semibold">{plan.name}</p>
            </div>
          </div>
          <p className="text-xl font-bold whitespace-nowrap">
            {formatVnd(plan.monthlyPriceVnd)}
            <span className="text-muted-foreground text-sm font-normal"> / month</span>
          </p>
        </div>
        {plan.description && <p className="text-muted-foreground mt-2 text-sm">{plan.description}</p>}
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {planLines(plan)
            .filter((line) => line.included)
            .map((line) => (
              <span key={line.label} className="flex items-center gap-2">
                <Check className="text-primary size-4 shrink-0" />
                {line.label}
              </span>
            ))}
        </div>
      </div>

      {canChooseAnnual && (
        <RadioGroup
          value={billingCycle}
          onValueChange={(value) => onBillingCycleChange(value as BillingCycle)}
          className="grid-flow-col justify-start gap-6"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="monthly" /> Monthly
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="annual" /> Annual
          </label>
        </RadioGroup>
      )}

      <div className="bg-muted grid grid-cols-3 divide-x rounded-lg text-sm">
        <div className="space-y-0.5 px-4 py-3">
          <p className="text-muted-foreground text-xs">Due today</p>
          <p className="font-semibold">{formatVnd(dueToday)}</p>
        </div>
        <div className="space-y-0.5 px-4 py-3">
          <p className="text-muted-foreground text-xs">First renewal</p>
          <p className="font-semibold">{formatDate(firstRenewal)}</p>
        </div>
        <div className="space-y-0.5 px-4 py-3">
          <p className="text-muted-foreground text-xs">Monthly rate</p>
          <p className="font-semibold">{formatVnd(monthlyRate)}</p>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        You&apos;ll scan a PayOS QR code to complete payment on the next step.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Not now
        </Button>
        <Button onClick={onContinue}>
          Continue to payment <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};
