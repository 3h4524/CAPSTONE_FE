"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge } from "lucide-react";

import { AllowanceMeter } from "@/components/dashboard/allowance-meter";
import { Card } from "@/components/ui/card";
import { allowanceResetLine, orderAllowances, remaining } from "@/helpers/allowance";
import { describeAllowanceState } from "@/helpers/seller-dashboard";
import { useAllowances } from "@/hooks/queries/use-allowances";
import { cn } from "@/utils/cn";

const SCOPE_LABELS = { free: "Free plan", trial: "Pro trial", plan: "Your plan" } as const;

const joinLabels = (labels: string[]) => labels.join(", ");

/**
 * What the Seller has left of their plan's allowances, worded and ordered as the allowance line in
 * Workflows shows them, under one line that says whether anything has run out or is about to.
 */
export const AllowancePanel = () => {
  const { data: allowances } = useAllowances();
  if (!allowances || allowances.items.length === 0) return null;

  const items = orderAllowances(allowances);
  const states = items.map((item) => describeAllowanceState(item.used, item.limit));
  const usedUp = items.filter((item) => remaining(item) === 0);
  const runningLow = items.filter((item, index) => states[index] === "near" && remaining(item) > 0);
  const summary =
    usedUp.length > 0
      ? {
          icon: AlertTriangle,
          className: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
          text: `No ${joinLabels(usedUp.map((item) => item.label))} left. Runs that need them are paused.`,
        }
      : runningLow.length > 0
        ? {
            icon: Gauge,
            className: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300",
            text: `Running low on ${joinLabels(runningLow.map((item) => item.label))}.`,
          }
        : {
            icon: CheckCircle2,
            className: "bg-ink-50 text-[#1f7f6b] dark:text-[#8ce3d1]",
            text: "Plenty left for this cycle.",
          };

  return (
    <Card className="h-full gap-3.5 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Plan allowance</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {allowanceResetLine(allowances) ?? "What your plan includes"}
            {allowances.mockupsPerRun !== null &&
              ` · up to ${allowances.mockupsPerRun} mockups per run`}
          </p>
        </div>
        {allowances.scope && (
          <span className="border-ink-200 bg-ink-50 text-ink-700 shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold">
            {SCOPE_LABELS[allowances.scope]}
          </span>
        )}
      </div>

      <p
        className={cn(
          "flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium",
          summary.className
        )}
      >
        <summary.icon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        <span className="first-letter:uppercase">{summary.text}</span>
      </p>

      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
          Left this cycle
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {items.map((item, index) => (
            <AllowanceMeter key={item.code} item={item} state={states[index]} />
          ))}
        </div>
      </div>

      <Link
        href="/subscription"
        className="text-ink-800 mt-auto inline-flex items-center justify-center gap-1.5 text-xs font-semibold hover:text-black hover:underline"
      >
        {usedUp.length > 0 ? "Upgrade to keep going" : "Compare plans"}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </Card>
  );
};
