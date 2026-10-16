"use client";

import { useState } from "react";
import Image from "next/image";

import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { previewFallbackFor } from "@/helpers/preview-fallback";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupTemplateCardProps = {
  template: MockupTemplate;
  selected: boolean;
  onToggle: (id: string) => void;
  /** Called when the pointer or keyboard focus reaches the card, so a preview can follow it. */
  onFocusTemplate?: (id: string) => void;
  /** The garment colors picked for this template. */
  colors?: string[];
};

// The template's own photo, cropped square; the stored preview is used when there is one.
const TemplateThumbnail = ({ template }: { template: MockupTemplate }) => {
  const [failed, setFailed] = useState(false);
  const source = template.previewImageUrl ?? template.baseImageUrl;

  return failed || !source ? (
    <span aria-hidden="true" className={cn("size-14 shrink-0 rounded-lg bg-linear-to-br", previewFallbackFor(template.id))} />
  ) : (
    <Image
      src={source}
      alt=""
      width={56}
      height={56}
      unoptimized
      onError={() => setFailed(true)}
      className="size-14 shrink-0 rounded-lg object-cover"
    />
  );
};

export const MockupTemplateCard = ({ template, selected, onToggle, onFocusTemplate, colors = [] }: MockupTemplateCardProps) => (
  <label
    onPointerEnter={() => onFocusTemplate?.(template.id)}
    onFocusCapture={() => onFocusTemplate?.(template.id)}
    className={cn(
      "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 transition-colors",
      selected ? "border-primary ring-primary/20 ring-2" : "border-slate-200 hover:border-slate-300"
    )}
  >
    <Checkbox checked={selected} onCheckedChange={() => onToggle(template.id)} aria-label={template.name} className="mt-1" />
    <TemplateThumbnail template={template} />
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-slate-900">{template.name}</span>
      <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="line-clamp-2">{template.productType}</span>
        {template.allowRecolor && <span>· recolorable</span>}
        {(selected && colors.length > 0 ? colors : template.garmentColor ? [template.garmentColor] : []).map((hex) => (
          <GarmentColorSwatch key={hex} hex={hex} />
        ))}
      </span>
    </span>
  </label>
);
