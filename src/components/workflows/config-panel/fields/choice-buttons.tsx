"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

type Choice = {
  value: string;
  label: string;
  /** Width and height of a shape drawn above the label, for aspect ratios. */
  ratio?: [number, number];
};

type ChoiceButtonsProps = Omit<ComponentProps<"div">, "onChange"> & {
  choices: Choice[];
  value: string;
  label: string;
  onChange: (value: string) => void;
};

const SHAPE_SIZE = 22;

// A row of buttons for a handful of values, so each one is a single click and all stay in view.
export const ChoiceButtons = ({ choices, value, label, onChange, className, ...props }: ChoiceButtonsProps) => (
  <div
    role="group"
    aria-label={label}
    className={cn("bg-muted/60 grid gap-1 rounded-lg p-1", className)}
    style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}
    {...props}
  >
    {choices.map((choice) => {
      const active = choice.value === value;
      const [width, height] = choice.ratio ?? [0, 0];
      const scale = SHAPE_SIZE / Math.max(width, height, 1);
      return (
        <Button
          key={choice.value}
          type="button"
          variant="none"
          aria-pressed={active}
          onClick={() => onChange(choice.value)}
          className={cn(
            "h-auto min-w-0 flex-col gap-1 rounded-md px-1 py-1.5 text-xs font-medium text-slate-600 hover:translate-y-0 hover:text-slate-900",
            active && "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
          )}
        >
          {choice.ratio && (
            <span className="flex size-6 items-center justify-center" aria-hidden="true">
              <span
                className={cn("rounded-[3px] border-[1.5px]", active ? "border-primary bg-primary/10" : "border-slate-400")}
                style={{ width: width * scale, height: height * scale }}
              />
            </span>
          )}
          {choice.label}
        </Button>
      );
    })}
  </div>
);
