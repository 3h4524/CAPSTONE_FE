"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, Pencil, Trash2 } from "lucide-react";

import { ImageLightbox } from "@/components/commons/data-display/image-lightbox";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { PhotoSourceTag } from "@/components/mockups/model-attributes-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { garmentColorName } from "@/helpers/garment-colors";
import { isAutomaticPlacement, mockupViewLabel, parsePrintLayout, templateView } from "@/helpers/mockup-template";
import { modelAttributesLabel } from "@/helpers/model-attributes";
import { photoEdgeColor } from "@/helpers/photo-edge-color";
import type { MockupTemplate } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupTemplateListItemProps = {
  template: MockupTemplate;
  busy?: boolean;
  /** Whether the edit and delete buttons show; by default only on the seller's own templates. */
  editable?: boolean;
  onEdit: (template: MockupTemplate) => void;
  onDelete: (template: MockupTemplate) => void;
};

export const MockupTemplateListItem = ({
  template,
  busy = false,
  editable = template.isMine,
  onEdit,
  onDelete,
}: MockupTemplateListItemProps) => {
  const [viewing, setViewing] = useState<number | null>(null);
  // The photo's own backdrop color, so the space beside it does not show as a band of another gray.
  const [backdrop, setBackdrop] = useState<string | null>(null);
  const layout = template.kind === "model" ? null : parsePrintLayout(template.printAreaConfig);
  // Kept by address, so a photo replaced through Edit is tried again.
  const [brokenImageUrl, setBrokenImageUrl] = useState<string | null>(null);
  const isImageBroken = brokenImageUrl === template.baseImageUrl;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      {/* The whole photo, portrait or landscape, never cropped; a click shows it large. */}
      <button
        type="button"
        onClick={() => setViewing(0)}
        disabled={isImageBroken}
        aria-label={`View ${template.name} larger`}
        className="bg-ink-100 relative block aspect-[4/3] w-full shrink-0 cursor-zoom-in overflow-hidden disabled:cursor-default"
        style={backdrop && !isImageBroken ? { backgroundColor: backdrop } : undefined}
      >
        {isImageBroken ? (
          <span className="text-ink-400 absolute inset-0 flex items-center justify-center">
            <ImageIcon className="size-8" aria-hidden="true" />
          </span>
        ) : (
          <Image
            src={template.baseImageUrl}
            alt={template.name}
            width={template.outputWidthPx || 640}
            height={template.outputHeightPx || 480}
            unoptimized
            crossOrigin="anonymous"
            onLoad={(event) => setBackdrop(photoEdgeColor(event.currentTarget))}
            onError={() => setBrokenImageUrl(template.baseImageUrl)}
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        <PhotoSourceTag system={template.isSystemTemplate} className="absolute top-1.5 right-1.5 md:hidden" />
        {!isImageBroken && template.garmentColor && template.garmentMaskUrl && (
          // Same geometry as object-contain, so the mask stays aligned with the photo.
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-multiply"
            style={{
              backgroundColor: template.garmentColor,
              maskImage: `url(${template.garmentMaskUrl})`,
              WebkitMaskImage: `url(${template.garmentMaskUrl})`,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
            }}
          />
        )}
      </button>
      <ImageLightbox
        images={[
          {
            id: template.id,
            url: template.baseImageUrl,
            alt: template.name,
            caption: template.name,
            width: template.outputWidthPx,
            height: template.outputHeightPx,
            backdrop: backdrop ?? undefined,
            tint:
              template.garmentColor && template.garmentMaskUrl
                ? { color: template.garmentColor, maskUrl: template.garmentMaskUrl }
                : undefined,
          },
        ]}
        index={viewing}
        onIndexChange={setViewing}
      />
      <CardContent className="flex flex-col gap-2 p-4 max-md:p-2.5">
        <div className="flex items-center gap-2">
          {/* Names often differ only at the end, so a phone gives them a second line. */}
          <p className="text-ink-900 min-w-0 flex-1 truncate font-semibold max-md:line-clamp-2 max-md:text-sm max-md:whitespace-normal">{template.name}</p>
          <PhotoSourceTag system={template.isSystemTemplate} className="max-md:hidden" />
        </div>
        <div className="flex flex-wrap gap-1.5 max-md:[&>*]:max-w-full max-md:[&>*]:whitespace-normal">
          <Badge variant="outline">{template.productType}</Badge>
          <Badge variant="outline" className="max-md:hidden">
            {template.outputWidthPx} x {template.outputHeightPx}
          </Badge>
          <Badge variant="outline" className={cn(template.usageCount === 0 && "max-md:hidden")}>Used {template.usageCount}x</Badge>
          {template.realisticPrintReady && <Badge variant="secondary">Realistic print</Badge>}
          {template.allowRecolor && template.kind !== "model" && (
            <Badge variant="secondary">Recolorable</Badge>
          )}
          {template.kind === "model" && modelAttributesLabel(template.attributes) && (
            <Badge variant="secondary">{modelAttributesLabel(template.attributes)}</Badge>
          )}
          {template.aiGenerated && <Badge variant="outline">Made with AI</Badge>}
          {template.kind !== "model" && layout && layout.view !== "front" && (
            <Badge variant="secondary">{mockupViewLabel(layout.view)}</Badge>
          )}
          {template.views && template.views.length > 0 && (
            <Badge variant="secondary">
              Front + {template.views.map((side) => mockupViewLabel(templateView(side)).toLowerCase()).join(", ")}
            </Badge>
          )}
          {template.kind !== "model" && layout && layout.areas.length > 1 && (
            <Badge variant="outline">{layout.areas.length} print areas</Badge>
          )}
          {template.kind === "model" && (
            <Badge variant="secondary">
              {isAutomaticPlacement(template.printAreaConfig)
                ? "Automatic placement"
                : "Own print area"}
            </Badge>
          )}
          {template.garmentColor && (
            <Badge variant="outline" className="gap-1.5">
              <GarmentColorSwatch hex={template.garmentColor} />
              {garmentColorName(template.garmentColor)}
            </Badge>
          )}
        </div>
        {editable && (
          <div className="mt-1 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-md:flex-1"
              disabled={busy}
              onClick={() => onEdit(template)}
            >
              <Pencil aria-hidden="true" />
              <span className="max-md:sr-only">Edit</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="max-md:flex-1"
              disabled={busy}
              onClick={() => onDelete(template)}
            >
              <Trash2 aria-hidden="true" />
              <span className="max-md:sr-only">Delete</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
