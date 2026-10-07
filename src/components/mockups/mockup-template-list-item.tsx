"use client";

import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";

import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { garmentColorName } from "@/helpers/garment-colors";
import type { MockupTemplate } from "@/types/mockup-templates";

type MockupTemplateListItemProps = {
  template: MockupTemplate;
  busy?: boolean;
  onEdit: (template: MockupTemplate) => void;
  onDelete: (template: MockupTemplate) => void;
};

export const MockupTemplateListItem = ({ template, busy = false, onEdit, onDelete }: MockupTemplateListItemProps) => (
  <Card className="overflow-hidden">
    <div className="relative">
      <Image
        src={template.baseImageUrl}
        alt={template.name}
        width={640}
        height={360}
        unoptimized
        className="aspect-video w-full object-cover"
      />
      {template.garmentColor && template.garmentMaskUrl && (
        // Same geometry as object-cover, so the mask stays aligned with the cropped photo.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-multiply"
          style={{
            backgroundColor: template.garmentColor,
            maskImage: `url(${template.garmentMaskUrl})`,
            WebkitMaskImage: `url(${template.garmentMaskUrl})`,
            maskSize: "cover",
            WebkitMaskSize: "cover",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />
      )}
    </div>
    <CardContent className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate font-semibold text-slate-900">{template.name}</p>
        <Badge variant={template.isSystemTemplate ? "secondary" : "default"}>
          {template.isSystemTemplate ? "System" : "Mine"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{template.productType}</Badge>
        <Badge variant="outline">{template.outputWidthPx} x {template.outputHeightPx}</Badge>
        <Badge variant="outline">Used {template.usageCount}x</Badge>
        {template.realisticPrintReady && <Badge variant="secondary">Realistic print</Badge>}
        {template.allowRecolor && <Badge variant="secondary">Recolorable</Badge>}
        {template.garmentColor && (
          <Badge variant="outline" className="gap-1.5">
            <GarmentColorSwatch hex={template.garmentColor} />
            {garmentColorName(template.garmentColor)}
          </Badge>
        )}
      </div>
      {template.isMine && (
        <div className="mt-1 flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onEdit(template)}>
            <Pencil aria-hidden="true" />
            Edit
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onDelete(template)}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);
