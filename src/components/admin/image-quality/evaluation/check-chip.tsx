import { Check, X } from "lucide-react";

import { cn } from "@/utils/cn";

type CheckChipProps = {
  label: string;
  isPassed: boolean;
};

export const CheckChip = ({ label, isPassed }: CheckChipProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
      isPassed ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
    )}
  >
    {isPassed ? (
      <Check className="size-3.5" aria-label="passed" />
    ) : (
      <X className="size-3.5" aria-label="failed" />
    )}
    {label}
  </span>
);
