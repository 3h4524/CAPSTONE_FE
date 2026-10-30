"use client";

import { NodeControl } from "@/components/workflows/nodes/node-control";
import { cn } from "@/utils/cn";

type NodeTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  maxLength?: number;
  disabled?: boolean;
  rows?: number;
  className?: string;
};

export const NodeTextInput = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
  maxLength,
  disabled = false,
  rows = 1,
  className,
}: NodeTextInputProps) => (
  <NodeControl>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      maxLength={maxLength}
      disabled={disabled}
      rows={rows}
      style={{ minHeight: `${Math.max(2, rows + 0.75)}rem` }}
      className={cn(
        "border-wf-line bg-wf-muted/50 text-wf-ink placeholder:text-wf-faint focus-visible:border-wf-accent focus-visible:ring-wf-accent/30 block field-sizing-content max-h-24 w-full resize-none overflow-y-auto rounded-md border px-2.5 py-1.5 text-[11px] leading-4 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  </NodeControl>
);
