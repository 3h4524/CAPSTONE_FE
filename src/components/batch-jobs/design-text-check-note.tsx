import { CircleAlert, CircleCheck } from "lucide-react";

import { summarizeTextCheck } from "@/helpers/design-text-check";
import type { DesignTextCheck } from "@/types/batch-jobs";
import { cn } from "@/utils/cn";

type DesignTextCheckNoteProps = {
  check: DesignTextCheck | null | undefined;
  className?: string;
};

/** One line under a design saying whether OCR read the phrase it should print. It only warns: OCR can misread. */
export const DesignTextCheckNote = ({ check, className }: DesignTextCheckNoteProps) => {
  const summary = summarizeTextCheck(check);
  if (!summary) return null;

  const warning = summary.tone === "warning";
  const Icon = warning ? CircleAlert : CircleCheck;
  return (
    <p
      title={summary.read}
      className={cn("flex items-start gap-1 text-[11px] leading-snug", warning ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300", className)}
    >
      <Icon className="mt-px size-3 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">{summary.label}</span>
        {summary.detail && <span>: {summary.detail}</span>}
        <span className="sr-only">. {summary.read}</span>
      </span>
    </p>
  );
};
