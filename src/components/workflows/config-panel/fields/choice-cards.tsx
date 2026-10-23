"use client";

import type { ComponentProps } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { WorkflowOption } from "@/types/workflow";
import { cn } from "@/utils/cn";

type ChoiceCardsProps = Omit<ComponentProps<typeof RadioGroup>, "onChange" | "onValueChange"> & {
  name: string;
  options: WorkflowOption[];
  value: string;
  onChange: (value: string) => void;
};

// Options that need a line of explanation each, such as how a review step behaves.
export const ChoiceCards = ({ name, options, value, onChange, className, ...props }: ChoiceCardsProps) => (
  <RadioGroup value={value} onValueChange={onChange} className={cn("gap-2", className)} {...props}>
    {options.map((option) => {
      const id = `${name}-${option.value}`;
      const active = option.value === value;
      return (
        <label
          key={option.value}
          htmlFor={id}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors has-disabled:cursor-not-allowed has-disabled:opacity-60",
            active ? "border-primary/60 bg-primary/[0.04]" : "hover:bg-muted/50 border-slate-200"
          )}
        >
          <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
          <span className="min-w-0 space-y-0.5">
            <span className="block text-sm font-medium text-slate-900">{option.label}</span>
            {option.description && <span className="text-muted-foreground block text-xs leading-relaxed">{option.description}</span>}
          </span>
        </label>
      );
    })}
  </RadioGroup>
);
