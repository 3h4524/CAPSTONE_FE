"use client";

import { SectionLoading } from "@/components/commons/loading/section-loading";
import { Button } from "@/components/ui/button";
import { FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkflowOption } from "@/types/workflow";

type OptionSelectProps = {
  value: string;
  options: WorkflowOption[];
  placeholder: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
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
}: OptionSelectProps) => {
  if (isLoading) return <SectionLoading label="Loading options" className="justify-start p-2" />;

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">
        Options could not be loaded.
        {onRetry && (
          <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" onClick={onRetry}>Retry</Button>
        )}
      </div>
    );
  }

  if (options.length === 0) {
    return <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs">{emptyMessage}</p>;
  }

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <FormControl>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
