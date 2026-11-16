"use client";

import { useTranslation } from "react-i18next";

import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { MockupBackgroundPicker, MockupBackgroundSwatch } from "@/components/mockups/mockup-background-picker";
import { garmentColorName } from "@/helpers/garment-colors";
import { backgroundKeys, resolveBackground } from "@/helpers/mockup-backgrounds";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupBackgroundChoiceProps = {
  template: MockupTemplate;
  /** The garment colors ticked for the template; none when it is made in its own color only. */
  colors: string[];
  /** The garment color the template is shown in, which is the one whose background is chosen here. */
  shownColor?: string;
  /** The backgrounds picked for the template so far, by garment color. */
  backgrounds?: Record<string, string>;
  disabled?: boolean;
  onShowColor: (hex: string) => void;
  onChange: (key: string, hex: string | null) => void;
};

// One background choice per template, for the garment color it is being shown in. Each garment color still has
// a background of its own: switching the color (here or in the preview) switches which one is being chosen,
// so a template in many colors does not grow one picker per color.
export const MockupBackgroundChoice = ({ template, colors, shownColor, backgrounds, disabled = false, onShowColor, onChange }: MockupBackgroundChoiceProps) => {
  const { t } = useTranslation("common");
  const shownKey = backgroundKeys(shownColor ? [shownColor] : [])[0];

  return (
    <div className="ml-4 space-y-2 rounded-lg border border-dashed p-3">
      <p className="text-ink-900 text-xs font-medium">{t("batchSetup.mockup.backgroundFor", { name: template.name })}</p>
      {colors.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("batchSetup.mockup.backgroundColorGroup")}>
          {colors.map((hex) => {
            const shown = hex.toLowerCase() === shownColor?.toLowerCase();
            const background = resolveBackground(backgrounds, backgroundKeys([hex])[0]);
            return (
              <button
                key={hex}
                type="button"
                aria-label={t("batchSetup.mockup.backgroundForGarment", { name: garmentColorName(hex) })}
                aria-pressed={shown}
                disabled={disabled}
                onClick={() => onShowColor(hex)}
                className={cn("flex items-center gap-1 rounded-full p-0.5", shown && "ring-primary ring-2")}
              >
                <GarmentColorSwatch hex={hex} className="size-5" />
                {/* The background already chosen for this garment color, so all of them can be seen at a glance. */}
                {background && <MockupBackgroundSwatch hex={background} className="mr-1" />}
              </button>
            );
          })}
        </div>
      )}
      {colors.length > 1 && shownColor && (
        <p className="text-ink-700 flex items-center gap-1.5 text-xs">
          <GarmentColorSwatch hex={shownColor} />
          {t("batchSetup.mockup.garment", { name: garmentColorName(shownColor) })}
        </p>
      )}
      {/* Keyed by the garment color, so a color typed for one is not left in the field for the next. */}
      <MockupBackgroundPicker key={shownKey} value={resolveBackground(backgrounds, shownKey)} disabled={disabled} onChange={(hex) => onChange(shownKey, hex)} />
      <p className="text-muted-foreground text-xs">
        {t("batchSetup.mockup.backgroundHint")}
        {colors.length > 1 && ` ${t("batchSetup.mockup.backgroundPerColor")}`}
      </p>
    </div>
  );
};
