import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { describeChange } from "@/helpers/seller-dashboard";
import type { Kpi } from "@/types/seller-dashboard";
import { cn } from "@/utils/cn";

type KpiCardProps = {
  label: string;
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
  good: "text-emerald-600",
  bad: "text-rose-600",
  neutral: "text-muted-foreground",
} as const;

/** One figure of the Dashboard's KPI row: the value, and how it moved against the period before. */
export const KpiCard = ({
  label,
  icon: Icon,
  kpi,
  formatValue,
  periodLabel,
  isLowerBetter = false,
  emptyHint,
}: KpiCardProps) => {
  const change = describeChange(kpi, isLowerBetter);

  return (
    <Card className="group flex-row items-center justify-between gap-3 rounded-2xl px-5 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="min-w-0">
        <p className="text-muted-foreground truncate text-xs font-medium">{label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl leading-tight font-semibold tracking-tight tabular-nums">
            {formatValue(kpi.value)}
          </p>
          {change && (
            <span className={cn("text-xs font-semibold tabular-nums", TONE_CLASSES[change.tone])}>
              {change.text}
            </span>
          )}
        </div>
        <p className="text-muted-foreground truncate text-[11px]">
          {change ? `vs previous ${periodLabel}` : (emptyHint ?? `No data before the ${periodLabel}`)}
        </p>
      </div>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef4fb] text-[#4f709c] ring-1 ring-[#dbe7f4] transition-transform duration-300 ring-inset group-hover:scale-110 group-hover:-rotate-6">
        <Icon className="size-5" aria-hidden="true" />
      </span>
    </Card>
  );
};
