"use client";

import { X } from "lucide-react";

import { cn } from "@/utils/cn";

type SelectClearButtonProps = {
  /** What the button does, read out and shown on hover, such as "Clear the product". */
  label: string;
  onClear: () => void;
  size?: "sm" | "default";
  className?: string;
};

/**
 * Takes back the choice of a dropdown that may stay empty. It sits over the dropdown's arrow, inside a
 * `relative` box around the trigger: the trigger is a button itself, so this can't go inside it. Give the
 * trigger SELECT_CLEARABLE_TRIGGER while the button shows, so the arrow under it is hidden.
 */
export const SelectClearButton = ({
  label,
  onClear,
  size = "default",
  className,
}: SelectClearButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    // Kept from the trigger, so clearing does not open the list too.
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation();
      onClear();
    }}
    className={cn(
      "text-muted-foreground absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none",
      size === "sm" ? "right-1.5 size-5" : "right-2 size-6",
      className
    )}
  >
    <X className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden="true" />
  </button>
);

/** For the trigger of a dropdown showing SelectClearButton: hides its own arrow, which the button covers. */
export const SELECT_CLEARABLE_TRIGGER = "[&>svg:last-child]:invisible";
