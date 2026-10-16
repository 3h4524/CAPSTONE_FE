"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isGarmentColor } from "@/helpers/garment-colors";
import { MOCKUP_BACKGROUNDS, mockupBackgroundName } from "@/helpers/mockup-backgrounds";
import { cn } from "@/utils/cn";

type MockupBackgroundPickerProps = {
  /** The chosen '#RRGGBB', or null to keep the photo's own background. */
  value: string | null;
  onChange: (hex: string | null) => void;
  disabled?: boolean;
};

export const MockupBackgroundSwatch = ({ hex, className }: { hex: string; className?: string }) => (
  <span
    title={`Background: ${mockupBackgroundName(hex)}`}
    className={cn("inline-block size-3.5 shrink-0 rounded-sm border border-slate-300", className)}
    style={{ backgroundColor: hex }}
  />
);

// One background per template: the photo's own, a suggested color or any '#RRGGBB'.
export const MockupBackgroundPicker = ({ value, onChange, disabled = false }: MockupBackgroundPickerProps) => {
  const [custom, setCustom] = useState("");
  const customHex = custom.startsWith("#") ? custom : `#${custom}`;
  const isChosen = (hex: string) => value?.toLowerCase() === hex.toLowerCase();
  const ownChoice = value && !MOCKUP_BACKGROUNDS.some((color) => isChosen(color.hex)) ? [value] : [];

  const applyCustom = () => {
    if (!isGarmentColor(customHex)) return;
    onChange(customHex.toUpperCase());
    setCustom("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={value === null ? "default" : "outline"}
          size="sm"
          className="h-6 px-2 text-xs"
          aria-pressed={value === null}
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          Original
        </Button>
        {[...MOCKUP_BACKGROUNDS.map((color) => color.hex), ...ownChoice].map((hex) => (
          <button
            key={hex}
            type="button"
            aria-pressed={isChosen(hex)}
            aria-label={`${mockupBackgroundName(hex)} background`}
            title={mockupBackgroundName(hex)}
            disabled={disabled}
            onClick={() => onChange(hex)}
            className={cn(
              "flex size-6 items-center justify-center rounded-sm border border-slate-300 transition disabled:opacity-40",
              isChosen(hex) && "ring-primary ring-2 ring-offset-2"
            )}
            style={{ backgroundColor: hex }}
          >
            {isChosen(hex) && <Check className="size-3.5 text-white mix-blend-difference" aria-hidden="true" />}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(event) => setCustom(event.target.value.trim())}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyCustom();
            }
          }}
          placeholder="#EDE6DA"
          maxLength={7}
          disabled={disabled}
          aria-label="Custom background color"
          className="h-7 w-32 text-xs"
        />
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={disabled || !isGarmentColor(customHex)} onClick={applyCustom}>
          Use color
        </Button>
      </div>
    </div>
  );
};
