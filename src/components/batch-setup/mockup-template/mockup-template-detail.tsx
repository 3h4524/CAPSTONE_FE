"use client";

import { MockupTemplatePreview } from "@/components/batch-setup/mockup-template/mockup-template-preview";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { garmentColorName } from "@/helpers/garment-colors";
import { backgroundKeys, resolveBackground } from "@/helpers/mockup-backgrounds";
import { parsePrintArea } from "@/helpers/mockup-template";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupTemplateDetailProps = {
  template: MockupTemplate | null;
  /** The garment colors picked for this template; the preview can show each of them. */
  colors?: string[];
  /** The backgrounds picked for this template, by garment color; the preview shows the one of the color it is in. */
  backgrounds?: Record<string, string>;
  /** A generated design to show inside the print area. */
  designUrl?: string | null;
  /** The garment color to show the template in; the first picked one when it is not among them. */
  shownColor?: string;
  onShowColor?: (hex: string) => void;
};

export const MockupTemplateDetail = ({ template, colors = [], backgrounds, designUrl, shownColor, onShowColor }: MockupTemplateDetailProps) => {

  if (!template) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 rounded-xl bg-slate-50 p-5 text-sm">
        <p className="font-semibold text-slate-900">No template to preview</p>
        <p className="text-muted-foreground">Point at a template on the left to see how it looks.</p>
      </div>
    );
  }

  const area = parsePrintArea(template.printAreaConfig);
  const pickedColor = colors.find((hex) => hex.toLowerCase() === shownColor?.toLowerCase()) ?? colors[0];
  const previewColor = pickedColor ?? template.garmentColor;
  const background = resolveBackground(backgrounds, backgroundKeys(pickedColor ? [pickedColor] : [])[0]);

  return (
    <ScrollArea className="h-full [&>[data-radix-scroll-area-viewport]>div]:block!">
      <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-5" aria-live="polite">
        <MockupTemplatePreview template={template} color={previewColor} background={background} designUrl={designUrl} />
        <div>
          <p className="font-semibold text-slate-900">{template.name}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{template.productType}</Badge>
            <Badge variant="outline">{template.outputWidthPx} x {template.outputHeightPx}</Badge>
            {template.allowRecolor && <Badge variant="outline">Recolorable</Badge>}
          </div>
        </div>
        {template.allowRecolor && colors.length > 1 && (
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Preview color</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {colors.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Preview in ${garmentColorName(hex)}`}
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
            The dashed box is where your design is placed
            {area ? ` (${Math.round(area.width)} × ${Math.round(area.height)} px)` : ""}.
          </p>
          <p>{designUrl ? "Shown with your first generated design." : "Generate designs first to see one in place."}</p>
        </div>
      </div>
    </ScrollArea>
  );
};
