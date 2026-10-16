"use client";

import { useState } from "react";
import Image from "next/image";

import { parsePrintArea } from "@/helpers/mockup-template";
import { previewFallbackFor } from "@/helpers/preview-fallback";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupTemplatePreviewProps = {
  template: MockupTemplate;
  /** The garment color to show; ignored for templates that cannot be recolored. */
  color?: string | null;
  /** A generated design to place in the print area; without one the area is only outlined. */
  designUrl?: string | null;
  className?: string;
};

const percent = (value: number, total: number) => `${(value / total) * 100}%`;

// The template's own photo with its print area outlined and, when known, a real design placed in it,
// so a seller can see what the garment looks like and where the artwork would land.
export const MockupTemplatePreview = ({ template, color, designUrl, className }: MockupTemplatePreviewProps) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  const area = parsePrintArea(template.printAreaConfig);
  const width = template.outputWidthPx || 1;
  const height = template.outputHeightPx || 1;
  const tint = color && template.allowRecolor && template.garmentMaskUrl ? { color, maskUrl: template.garmentMaskUrl } : null;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-lg bg-slate-100", className)} style={{ aspectRatio: `${width} / ${height}` }}>
      {photoFailed ? (
        <span aria-hidden="true" className={cn("absolute inset-0 bg-linear-to-br", previewFallbackFor(template.id))} />
      ) : (
        <Image
          src={template.baseImageUrl}
          alt={template.name}
          fill
          unoptimized
          sizes="320px"
          className="object-cover"
          onError={() => setPhotoFailed(true)}
        />
      )}
      {tint && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-multiply"
          style={{
            backgroundColor: tint.color,
            maskImage: `url(${tint.maskUrl})`,
            WebkitMaskImage: `url(${tint.maskUrl})`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />
      )}
      {area && (
        // A white dashed line with a thin dark outline, so the frame shows on a white shirt and on a black one.
        <div
          className={cn(
            "absolute overflow-hidden border-2 border-dashed border-white/90 shadow-[0_0_0_1px_rgb(0_0_0/0.4),inset_0_0_0_1px_rgb(0_0_0/0.25)]",
            !designUrl && "bg-white/10"
          )}
          style={{ left: percent(area.x, width), top: percent(area.y, height), width: percent(area.width, width), height: percent(area.height, height) }}
          data-testid="print-area"
        >
          {designUrl && (
            // object-contain mirrors how the design is fitted into the print area when mock-ups are made.
            <Image src={designUrl} alt="Your design in the print area" fill unoptimized sizes="200px" className="object-contain" />
          )}
        </div>
      )}
    </div>
  );
};
