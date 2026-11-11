import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { describeChange } from "@/helpers/seller-dashboard";
import type { Kpi } from "@/types/seller-dashboard";
import { cn } from "@/utils/cn";

type KpiCardProps = {
  label: string;
  /** Replaces the label on a phone, where the card is half the width. */
  shortLabel?: string;
  icon: LucideIcon;
  kpi: Kpi;
  formatValue: (value: number) => string;
  /** E.g. "30 days", for the comparison line. */
  periodLabel: string;
  /** For costs, where a rise is bad news. */
  isLowerBetter?: boolean;
  /** Shown instead of the comparison when there is nothing to compare, e.g. how to get started. */
  emptyHint?: string;
};

const TONE_CLASSES = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-rose-600 dark:text-rose-400",
  neutral: "text-muted-foreground",
} as const;

/** One figure of the Dashboard's KPI row: the value, and how it moved against the period before. */
export const KpiCard = ({
  label,
  shortLabel,
  icon: Icon,
  kpi,
  formatValue,
  periodLabel,
  isLowerBetter = false,
  emptyHint,
}: KpiCardProps) => {
  const change = describeChange(kpi, isLowerBetter);

  return (
    <Card className="group hover:border-ink-300 flex-row items-center justify-between gap-3 rounded-2xl px-5 py-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md max-sm:relative max-sm:items-start max-sm:px-3.5 max-sm:py-3">
      <div className="min-w-0">
        <p className="text-muted-foreground truncate text-xs font-medium max-sm:pr-7 max-sm:whitespace-normal">
          {shortLabel ? (
            <>
              <span className="sm:hidden">{shortLabel}</span>
              <span className="max-sm:hidden">{label}</span>
            </>
          ) : (
            label
          )}
        </p>
        <div className="mt-1 flex items-baseline gap-2 max-sm:mt-3 max-sm:flex-wrap">
          <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums">
            {formatValue(kpi.value)}
          </p>
          {change && (
            <span className={cn("text-xs font-semibold tabular-nums", TONE_CLASSES[change.tone])}>
              {change.text}
            </span>
          )}
        </div>
        <p className="text-muted-foreground truncate text-[11px] max-sm:whitespace-normal">
          {change ? `vs previous ${periodLabel}` : (emptyHint ?? `No data before the ${periodLabel}`)}
        </p>
      </div>
      <span className="bg-ink-100 ring-ink-200 flex size-11 shrink-0 items-center justify-center rounded-xl text-[#4f709c] ring-1 transition-transform duration-300 ring-inset group-hover:scale-110 group-hover:-rotate-6 max-sm:absolute max-sm:top-2.5 max-sm:right-2.5 max-sm:size-8 dark:text-[#a0b4cf]">
        <Icon className="size-5 max-sm:size-4" aria-hidden="true" />
      </span>
    </Card>
  );
};
