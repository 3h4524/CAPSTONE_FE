"use client";

import { useTranslation } from "react-i18next";

import { NodeControl } from "@/components/workflows/nodes/node-control";
import type { WorkflowOption } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodeSegmentedProps = {
  options: WorkflowOption[];
  value: string;
  ariaLabel: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

// A soft track with a light raised chip for the choice: the same look as the other segmented pickers
// in the app, so the choice reads clearly without shouting.
const trackClassName = "bg-ink-100 flex h-8 items-stretch gap-0.5 rounded-lg p-0.5";

const segmentClassName =
  "flex min-w-0 flex-1 items-center justify-center truncate rounded-md border border-transparent px-1.5 text-[11px] leading-none font-medium transition-[background-color,border-color,color,box-shadow] duration-150 motion-reduce:transition-none";

const selectedClassName = "bg-card border-ink-200 text-ink-900 font-semibold shadow-sm";

export const NodeSegmented = ({
  options,
  value,
  ariaLabel,
  onChange,
  disabled = false,
}: NodeSegmentedProps) => {
  const { t } = useTranslation("common");
  const selected = options.find((option) => option.value === value);

  if (!onChange) {
    return (
      <div
        className={trackClassName}
        aria-label={`${ariaLabel}: ${selected?.label ?? t("workflowEditor.nodeSegmented.notSet")}`}
      >
        {options.map((option) => (
          <span
            key={option.value}
            aria-hidden="true"
            className={cn(
              segmentClassName,
              option.value === value ? selectedClassName : "text-ink-500"
            )}
          >
            {option.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <NodeControl>
      <div className={trackClassName} role="radiogroup" aria-label={ariaLabel}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              segmentClassName,
              "focus-visible:ring-primary/30 cursor-pointer outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
              option.value === value
                ? selectedClassName
                : "text-ink-600 hover:text-ink-900"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </NodeControl>
  );
};
