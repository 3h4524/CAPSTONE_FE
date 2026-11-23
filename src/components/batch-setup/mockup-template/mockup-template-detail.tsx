"use client";

import { useTranslation } from "react-i18next";

import { MockupTemplatePreview } from "@/components/batch-setup/mockup-template/mockup-template-preview";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { garmentColorName } from "@/helpers/garment-colors";
import { backgroundKeys, resolveBackground } from "@/helpers/mockup-backgrounds";
import { parsePrintArea } from "@/helpers/mockup-template";
import type { MockupTemplate, MockupTemplatePlacement } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupTemplateDetailProps = {
  template: MockupTemplate | null;
  /** The garment colors picked for this template; the preview can show each of them. */
  colors?: string[];
  /** The backgrounds picked for this template, by garment color; the preview shows the one of the color it is in. */
  backgrounds?: Record<string, string>;
  /** Where this workflow puts the design, when it is not where the template has it. */
  placement?: MockupTemplatePlacement;
  /** A generated design to show inside the print area. */
  designUrl?: string | null;
  /** The garment color to show the template in; the first picked one when it is not among them. */
  shownColor?: string;
  onShowColor?: (hex: string) => void;
};

export const MockupTemplateDetail = ({ template, colors = [], backgrounds, placement, designUrl, shownColor, onShowColor }: MockupTemplateDetailProps) => {
  const { t } = useTranslation("common");

  if (!template) {
    return (
      <div className="bg-ink-50 flex h-full flex-col justify-center gap-2 rounded-xl p-5 text-sm">
        <p className="text-ink-900 font-semibold">{t("batchSetup.mockup.noPreview")}</p>
        <p className="text-muted-foreground">{t("batchSetup.mockup.noPreviewHint")}</p>
      </div>
    );
  }

  const area = placement ?? parsePrintArea(template.printAreaConfig);
  const pickedColor = colors.find((hex) => hex.toLowerCase() === shownColor?.toLowerCase()) ?? colors[0];
  const previewColor = pickedColor ?? template.garmentColor;
  const background = resolveBackground(backgrounds, backgroundKeys(pickedColor ? [pickedColor] : [])[0]);

  return (
    <ScrollArea className="h-full [&>[data-radix-scroll-area-viewport]>div]:block!">
      <div className="bg-ink-50 flex flex-col gap-4 rounded-xl p-5" aria-live="polite">
        <MockupTemplatePreview template={template} color={previewColor} background={background} placement={placement} designUrl={designUrl} />
        <div>
          <p className="text-ink-900 font-semibold">{template.name}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{template.productType}</Badge>
            <Badge variant="outline">{template.outputWidthPx} x {template.outputHeightPx}</Badge>
            {template.allowRecolor && <Badge variant="outline">{t("batchSetup.mockup.recolorable")}</Badge>}
          </div>
        </div>
        {template.allowRecolor && colors.length > 1 && (
          <div>
            <p className="text-ink-500 text-xs font-semibold tracking-wide uppercase">{t("batchSetup.mockup.previewColor")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {colors.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={t("batchSetup.mockup.previewIn", { name: garmentColorName(hex) })}
                  aria-pressed={hex === pickedColor}
                  onClick={() => onShowColor?.(hex)}
                  className={cn("rounded-full p-0.5", hex === pickedColor && "ring-primary ring-2")}
                >
                  <GarmentColorSwatch hex={hex} className="size-5" />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="text-muted-foreground space-y-1 text-xs">
          <p>
            {area
              ? t("batchSetup.mockup.dashedBoxSize", { width: Math.round(area.width), height: Math.round(area.height) })
              : t("batchSetup.mockup.dashedBox")}
          </p>
          <p>{designUrl ? t("batchSetup.mockup.shownWithDesign") : t("batchSetup.mockup.generateFirst")}</p>
        </div>
      </div>
    </ScrollArea>
  );
};
