"use client";

import { Loader2 } from "lucide-react";

import { SELECT_CLEARABLE_TRIGGER, SelectClearButton } from "@/components/commons/forms/select-clear-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OptionThumbnail } from "@/components/workflows/config-panel/fields/option-thumbnail";
import { NodeControl } from "@/components/workflows/nodes/node-control";
import type { WorkflowOption } from "@/types/workflow";
import { cn } from "@/utils/cn";

type NodeFieldProps = {
  value?: string;
  displayValue?: string;
  placeholder: string;
  options?: WorkflowOption[];
  onChange?: (value: string) => void;
  /** For a field that may stay empty, what it shows while empty; a × in the field takes the choice back. */
  noneLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

const getSecondLine = (option: WorkflowOption) => option.hint ?? option.description?.split(/(?<=\.)\s/)[0];

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
  const interactive = Boolean(options && onChange && (options.length > 0 || value));
  const canClear = Boolean(noneLabel && value && !disabled);
  const withImages = Boolean(options?.some((option) => option.imageUrl !== undefined));
  const rich = withImages || Boolean(options?.some((option) => getSecondLine(option)));

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
          title={label}
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
      {/* An empty value shows the placeholder, or what an empty field means. */}
      <Select value={value ?? ""} onValueChange={(next) => next !== value && onChange?.(next)} disabled={disabled}>
        <div className="relative min-w-0">
          <SelectTrigger
            size="sm"
            aria-label={ariaLabel ?? placeholder}
            title={displayValue}
            className={cn(
              "border-wf-line bg-wf-muted/50 text-wf-ink data-[placeholder]:text-wf-faint focus-visible:border-wf-accent focus-visible:ring-wf-accent/30 [&_svg]:text-wf-faint h-8 w-full min-w-0 rounded-md px-2.5 py-0 text-[11px] leading-none shadow-none [&_svg]:size-3",
              canClear && SELECT_CLEARABLE_TRIGGER
            )}
          >
            <SelectValue placeholder={noneLabel ?? placeholder}>
              {displayValue ? <span className="truncate">{displayValue}</span> : undefined}
            </SelectValue>
          </SelectTrigger>
          {canClear && (
            <SelectClearButton size="sm" label={`Clear: ${displayValue ?? "this choice"}`} onClear={() => onChange?.("")} />
          )}
        </div>
        <SelectContent
          position="popper"
          className="border-wf-line bg-wf-surface text-wf-ink w-72 max-w-[min(20rem,90vw)] min-w-(--radix-select-trigger-width)"
        >
          {options?.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={cn("focus:bg-wf-accent-soft focus:text-wf-ink text-[11px]", rich && "py-1.5 *:min-w-0")}
            >
              {rich ? (
                <span className="flex min-w-0 items-center gap-2">
                  {withImages && <OptionThumbnail imageUrl={option.imageUrl} className="size-8" />}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate" title={option.label}>{option.label}</span>
                    {getSecondLine(option) && (
                      <span className="text-wf-faint truncate text-[10px]">{getSecondLine(option)}</span>
                    )}
                  </span>
                </span>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </NodeControl>
  );
};
