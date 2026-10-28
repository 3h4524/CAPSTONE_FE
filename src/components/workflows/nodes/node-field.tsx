"use client";

import { Loader2 } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NodeControl } from "@/components/workflows/nodes/node-control";
import type { WorkflowOption } from "@/types/workflow";
import { cn } from "@/utils/cn";

const NONE_VALUE = "__none__";

type NodeFieldProps = {
  value?: string;
  displayValue?: string;
  placeholder: string;
  options?: WorkflowOption[];
  onChange?: (value: string) => void;
  noneLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

const fieldClassName =
  "border-wf-line bg-wf-muted/50 flex h-8 min-w-0 items-center gap-2 rounded-md border px-2.5";

export const NodeField = ({
  value,
  displayValue,
  placeholder,
  options,
  onChange,
  noneLabel,
  loading = false,
  disabled = false,
  ariaLabel,
}: NodeFieldProps) => {
  const interactive = Boolean(options && onChange && (options.length > 0 || noneLabel));

  if (loading) {
    return (
      <div className={fieldClassName} aria-busy="true">
        <span className="text-wf-faint min-w-0 flex-1 truncate text-[11px] leading-none">
          {displayValue || "Loading…"}
        </span>
        <Loader2 className="text-wf-faint size-3 shrink-0 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!interactive) {
    const label = displayValue || value;
    return (
      <div className={fieldClassName}>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[11px] leading-none",
            label ? "text-wf-ink font-medium" : "text-wf-faint"
          )}
        >
          {label || placeholder}
        </span>
      </div>
    );
  }

  return (
    <NodeControl>
      <Select
        value={value || (noneLabel ? NONE_VALUE : undefined)}
        onValueChange={(next) => onChange?.(next === NONE_VALUE ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger
          size="sm"
          aria-label={ariaLabel ?? placeholder}
          className="border-wf-line bg-wf-muted/50 text-wf-ink data-[placeholder]:text-wf-faint focus-visible:border-wf-accent focus-visible:ring-wf-accent/30 [&_svg]:text-wf-faint h-8 w-full min-w-0 rounded-md px-2.5 py-0 text-[11px] leading-none shadow-none [&_svg]:size-3"
        >
          <SelectValue placeholder={placeholder}>
            {displayValue ? <span className="truncate">{displayValue}</span> : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="border-wf-line bg-wf-surface text-wf-ink w-(--radix-select-trigger-width) min-w-0"
        >
          {noneLabel && <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>}
          {options?.map((option) => (
            <SelectItem key={option.value} value={option.value} className="focus:bg-wf-accent-soft focus:text-wf-ink text-[11px]">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </NodeControl>
  );
};
