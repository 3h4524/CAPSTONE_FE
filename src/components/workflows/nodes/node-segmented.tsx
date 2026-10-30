"use client";

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

const segmentClassName =
  "min-w-0 flex-1 truncate px-1 py-1.5 text-center text-[10px] leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const NodeSegmented = ({ options, value, ariaLabel, onChange, disabled = false }: NodeSegmentedProps) => {
  const selected = options.find((option) => option.value === value);

  if (!onChange) {
    return (
      <div
        className="border-wf-line flex overflow-hidden rounded-md border"
        aria-label={`${ariaLabel}: ${selected?.label ?? "not set"}`}
      >
        {options.map((option) => (
          <span
            key={option.value}
            aria-hidden="true"
            className={cn(
              segmentClassName,
              option.value === value
                ? "bg-wf-accent text-wf-surface font-semibold shadow-[0_0_12px_var(--wf-halo)]"
                : "text-wf-dim"
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
      <div
        className="border-wf-line flex overflow-hidden rounded-md border"
        role="radiogroup"
        aria-label={ariaLabel}
      >
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
              option.value === value
                ? "bg-wf-accent text-wf-surface font-semibold shadow-[0_0_12px_var(--wf-halo)]"
                : "text-wf-dim hover:text-wf-ink"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </NodeControl>
  );
};
