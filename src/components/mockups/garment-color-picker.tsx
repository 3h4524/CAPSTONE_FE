"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GARMENT_COLORS, garmentColorName, isGarmentColor } from "@/helpers/garment-colors";
import { cn } from "@/utils/cn";

type GarmentColorPickerProps = {
  selected: string[];
  onToggle: (hex: string) => void;
  disabled?: boolean;
  max?: number;
  /** Smaller swatches and input, for a picker repeated once per template. */
  compact?: boolean;
};

export const GarmentColorSwatch = ({ hex, className }: { hex: string; className?: string }) => (
  <span
    title={garmentColorName(hex)}
    className={cn("inline-block size-3.5 shrink-0 rounded-full border border-slate-300", className)}
    style={{ backgroundColor: hex }}
  />
);

export const GarmentColorPicker = ({ selected, onToggle, disabled = false, max, compact = false }: GarmentColorPickerProps) => {
  const [custom, setCustom] = useState("");
  const isSelected = (hex: string) => selected.some((value) => value.toLowerCase() === hex.toLowerCase());
  const full = max !== undefined && selected.length >= max;
  const customHex = custom.startsWith("#") ? custom : `#${custom}`;
  const customs = selected.filter((hex) => !GARMENT_COLORS.some((color) => color.hex.toLowerCase() === hex.toLowerCase()));

  const addCustom = () => {
    if (!isGarmentColor(customHex) || isSelected(customHex)) return;
    onToggle(customHex.toUpperCase());
    setCustom("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {[...GARMENT_COLORS.map((color) => color.hex), ...customs].map((hex) => {
          const active = isSelected(hex);
          return (
            <button
              key={hex}
              type="button"
              aria-pressed={active}
              aria-label={garmentColorName(hex)}
              title={garmentColorName(hex)}
              disabled={disabled || (!active && full)}
              onClick={() => onToggle(hex)}
              className={cn(
                "flex items-center justify-center rounded-full border border-slate-300 transition disabled:opacity-40",
                compact ? "size-6" : "size-8",
                active && "ring-primary ring-2 ring-offset-2"
              )}
              style={{ backgroundColor: hex }}
            >
              {active && <Check className={cn("text-white mix-blend-difference", compact ? "size-3.5" : "size-4")} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(event) => setCustom(event.target.value.trim())}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
          placeholder="#1F2A44"
          maxLength={7}
          disabled={disabled || full}
          aria-label="Custom garment color"
          className={cn("w-32", compact ? "h-7 text-xs" : "h-8")}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={compact ? "h-7 text-xs" : undefined}
          disabled={disabled || full || !isGarmentColor(customHex)}
          onClick={addCustom}
        >
          Add color
        </Button>
      </div>
    </div>
  );
};
