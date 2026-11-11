"use client";

import { SELECT_CLEARABLE_TRIGGER, SelectClearButton } from "@/components/commons/forms/select-clear-button";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OptionThumbnail } from "@/components/workflows/config-panel/fields/option-thumbnail";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { PANEL_SELECT_CONTENT_CLASS } from "@/constants/workflow-panel";
import type { WorkflowOption } from "@/types/workflow";
import { cn } from "@/utils/cn";

type OptionSelectProps = {
  value: string;
  options: WorkflowOption[];
  placeholder: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  /**
   * For a field that may stay empty, what it shows while empty (such as "No style"); a × in the field then
   * takes the choice back.
   */
  noneLabel?: string;
  /** For a field that may stay empty but has no name for that: the × shows, and the placeholder while empty. */
  clearable?: boolean;
  disabled?: boolean;
  /**
   * For a dropdown outside a node's settings form, which edits another node's config: the field then has
   * no form item to take its id and error state from, so it gets the given id instead.
   */
  standaloneId?: string;
};

export const OptionSelect = ({
  value,
  options,
  placeholder,
  onChange,
  isLoading = false,
  isError = false,
  emptyMessage = "No options available yet.",
  onRetry,
  noneLabel,
  clearable = false,
  disabled = false,
  standaloneId,
}: OptionSelectProps) => {
  const canClear = (clearable || Boolean(noneLabel)) && Boolean(value) && !disabled;
  // Shaped like the dropdown it stands in for, so the fields below do not jump when it loads.
  if (isLoading) return <SectionLoading label="Loading options" className="bg-muted/40 h-9 justify-start rounded-md border px-3 py-0 [&_svg]:size-4 [&>span]:text-xs" />;

  if (isError) {
    return (
      <PanelNotice
        tone="error"
        action={onRetry && (
          <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs text-rose-900 hover:translate-y-0" onClick={onRetry}>Retry</Button>
        )}
      >
        Options could not be loaded.
      </PanelNotice>
    );
  }

  if (options.length === 0 && !value) {
    return <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2.5 text-xs leading-relaxed">{emptyMessage}</p>;
  }

  // Options with a thumbnail or a second line get a richer list; the closed field still shows one line.
  const withImages = options.some((option) => option.imageUrl !== undefined);
  const rich = withImages || options.some((option) => option.hint);
  const selected = options.find((option) => option.value === value);

  // Inside a form the id comes from FormControl; an explicit id={undefined} here would wipe it out.
  const trigger = (
    <SelectTrigger
      {...(standaloneId ? { id: standaloneId } : {})}
      className={cn("w-full min-w-0 bg-white", withImages && "pl-1.5 data-[size=default]:h-10", canClear && SELECT_CLEARABLE_TRIGGER)}
    >
      <SelectValue placeholder={noneLabel ?? placeholder}>
        {rich && selected ? (
          <span className="flex min-w-0 items-center gap-2">
            {withImages && <OptionThumbnail imageUrl={selected.imageUrl} className="size-7" />}
            <span className="truncate">{selected.label}</span>
          </span>
        ) : undefined}
      </SelectValue>
    </SelectTrigger>
  );

  return (
    // An empty value shows the placeholder; Radix answers "" when the value stops matching an item, which is no choice.
    <Select value={value} onValueChange={(next) => next !== value && onChange(next)} disabled={disabled}>
      <div className="relative min-w-0">
        {standaloneId ? trigger : <FormControl>{trigger}</FormControl>}
        {canClear && <SelectClearButton label={`Clear: ${selected?.label ?? "this choice"}`} onClear={() => onChange("")} />}
      </div>
      <SelectContent position="popper" className={cn(PANEL_SELECT_CONTENT_CLASS, "w-(--radix-select-trigger-width)")}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className={cn(rich && "py-2 *:min-w-0")}>
            {rich ? (
              <span className="flex min-w-0 items-center gap-2.5">
                {withImages && <OptionThumbnail imageUrl={option.imageUrl} className="size-9" />}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{option.label}</span>
                  {option.hint && <span className="text-muted-foreground truncate text-xs">{option.hint}</span>}
                </span>
              </span>
            ) : (
              option.label
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
