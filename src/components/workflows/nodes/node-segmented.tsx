"use client";

import type { WorkflowOption } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodeSegmentedProps = {
  options: WorkflowOption[];
  value: string;
  ariaLabel: string;
};

export const NodeSegmented = ({ options, value, ariaLabel }: NodeSegmentedProps) => {
  const selected = options.find((option) => option.value === value);

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
            "flex-1 py-1.5 text-center text-[10px] leading-none",
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
};
