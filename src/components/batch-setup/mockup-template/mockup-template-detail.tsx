"use client";

import { useState } from "react";

import { MockupTemplatePreview } from "@/components/batch-setup/mockup-template/mockup-template-preview";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { garmentColorName } from "@/helpers/garment-colors";
import { parsePrintArea } from "@/helpers/mockup-template";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupTemplateDetailProps = {
  template: MockupTemplate | null;
  /** The garment colors picked for this template; the preview can show each of them. */
  colors?: string[];
  /** A generated design to show inside the print area. */
  designUrl?: string | null;
};

// Give this component a `key` of the template id so the chosen preview color resets per template.
export const MockupTemplateDetail = ({ template, colors = [], designUrl }: MockupTemplateDetailProps) => {
  const [colorIndex, setColorIndex] = useState(0);

  if (!template) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 rounded-xl bg-slate-50 p-5 text-sm">
        <p className="font-semibold text-slate-900">No template to preview</p>
        <p className="text-muted-foreground">Point at a template on the left to see how it looks.</p>
      </div>
    );
  }

  const area = parsePrintArea(template.printAreaConfig);
  const previewColor = colors[Math.min(colorIndex, colors.length - 1)] ?? template.garmentColor;

  return (
    <ScrollArea className="h-full [&>[data-radix-scroll-area-viewport]>div]:block!">
      <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-5" aria-live="polite">
        <MockupTemplatePreview template={template} color={previewColor} designUrl={designUrl} />
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
              {colors.map((hex, index) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`Preview in ${garmentColorName(hex)}`}
                  aria-pressed={index === colorIndex}
                  onClick={() => setColorIndex(index)}
                  className={cn("rounded-full p-0.5", index === colorIndex && "ring-primary ring-2")}
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
