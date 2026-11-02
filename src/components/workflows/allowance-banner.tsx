"use client";

import Link from "next/link";
import { Gauge } from "lucide-react";

import { allowanceLine, allowanceResetLine, remaining } from "@/helpers/allowance";
import { SUBSCRIPTION_PATH } from "@/helpers/plan-errors";
import { useAllowances } from "@/hooks/queries/use-allowances";
import type { AllowanceCode } from "@/types/allowance";
import { cn } from "@/utils/cn";

// The allowances that decide whether a workflow can run, in the order a run uses them.
const SHOWN: AllowanceCode[] = ["full_runs", "design_runs", "products", "design_images", "mockups", "videos", "listings"];

// A slim line above the canvas for Sellers on Free or the Pro trial: what is left before they run.
export const AllowanceBanner = () => {
  const { data: allowances } = useAllowances();
  if (!allowances || allowances.scope === null) return null;

  const items = SHOWN.flatMap((code) => allowances.items.filter((item) => item.code === code));
  const reset = allowanceResetLine(allowances);

  return (
    <div
      aria-label="Plan allowance"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-slate-50 px-4 py-2 text-xs text-slate-600"
    >
      <span className="flex items-center gap-1.5 font-semibold text-slate-800">
        <Gauge className="size-3.5" aria-hidden="true" />
        {allowances.scope === "trial" ? "Free trial" : allowances.scope === "plan" ? "Your plan this month" : "Free"}
      </span>
      {items.map((item) => (
        <span key={item.code} className={cn("tabular-nums", remaining(item) === 0 && "font-semibold text-rose-700")}>
          {allowanceLine(item)}
        </span>
      ))}
      {allowances.mockupsPerRun !== null && <span>Up to {allowances.mockupsPerRun} mockups per run</span>}
      {reset && <span className="text-slate-500">{reset}</span>}
      <Link href={SUBSCRIPTION_PATH} className="ml-auto font-semibold text-slate-800 underline underline-offset-2">
        View plans
      </Link>
    </div>
  );
};
