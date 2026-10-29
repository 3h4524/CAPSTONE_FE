"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";

import { ImageLightbox } from "@/components/commons/data-display/image-lightbox";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockupLightboxImages } from "@/helpers/lightbox-images";
import type { GenerateAllMockupsResult, MockupImage, RemovedMockupSlot } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupResultsGridProps = {
  result: GenerateAllMockupsResult;
  productNameById: Map<string | null, string>;
  /** Column classes of the image grid; a side panel passes fewer columns. */
  columnsClassName?: string;
  /** Changes one mock-up of a batch job alone; offered on each mock-up when given. */
  onEdit?: (image: MockupImage) => void;
  /** Puts back a mock-up that was removed for its product alone. */
  onRestore?: (slot: RemovedMockupSlot) => void;
  /** Turns the edit and restore buttons off, while the job's mock-ups are being made. */
  disabled?: boolean;
};

export const MockupResultsGrid = ({
  result,
  productNameById,
  columnsClassName = "grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
  onEdit,
  onRestore,
  disabled = false,
}: MockupResultsGridProps) => {
  const [viewing, setViewing] = useState<number | null>(null);
  const gallery = mockupLightboxImages(result.images, productNameById);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Generated {result.generatedCount} new mock-up{result.generatedCount === 1 ? "" : "s"}.
        {result.noDesignImageCount > 0 && ` ${result.noDesignImageCount} products have no image yet.`}
        {result.noCompatibleTemplateCount > 0 && ` ${result.noCompatibleTemplateCount} products have no matching template.`}
        {(result.noApprovedImageCount ?? 0) > 0 && ` ${result.noApprovedImageCount} products have no approved design.`}
      </p>
      {result.errors.length > 0 && (
        <ul className="text-destructive space-y-1 text-xs">
          {result.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      {result.images.length > 0 && (
        <div className={cn("grid", columnsClassName)}>
          {result.images.map((mockupImage, imageIndex) => {
            const productName = productNameById.get(mockupImage.productId) ?? "Product";
            return (
              <div key={mockupImage.id} className="group overflow-hidden rounded-lg border">
                {/* Opens the mock-up large on the page rather than in a new tab. */}
                <Button
                  type="button"
                  variant="none"
                  aria-label={`View the mock-up of ${productName} larger`}
                  onClick={() => setViewing(imageIndex)}
                  className="block h-auto w-full cursor-zoom-in overflow-hidden rounded-none p-0 hover:translate-y-0"
                >
                  <Image
                    src={mockupImage.mockupImageUrl}
                    alt={productNameById.get(mockupImage.productId) ?? "Mock-up"}
                    width={mockupImage.mockupWidthPx}
                    height={mockupImage.mockupHeightPx}
                    unoptimized
                    className="bg-muted aspect-square w-full object-cover transition group-hover:scale-105"
                  />
                </Button>
                <div className="text-muted-foreground flex items-center gap-1.5 p-2 text-xs">
                  {mockupImage.garmentColor && <GarmentColorSwatch hex={mockupImage.garmentColor} />}
                  <span className="min-w-0 flex-1 truncate">{productName}</span>
                  {mockupImage.override && <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Edited</Badge>}
                  {onEdit && mockupImage.slotKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit this mock-up of ${productName}`}
                      title="Edit this mock-up only"
                      disabled={disabled}
                      onClick={() => onEdit(mockupImage)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {onRestore && result.removed && result.removed.length > 0 && (
        <section className="space-y-1.5 rounded-lg border border-dashed p-3 text-xs" aria-label="Removed mock-ups">
          <p className="font-medium text-slate-700">Removed for single products</p>
          <ul className="space-y-1">
            {result.removed.map((slot) => (
              <li key={slot.slotKey} className="flex items-center gap-1.5">
                {slot.garmentColor && <GarmentColorSwatch hex={slot.garmentColor} />}
                <span className="text-muted-foreground min-w-0 flex-1 truncate">
                  {productNameById.get(slot.productId) ?? "Product"} · {slot.templateName}
                </span>
                <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" disabled={disabled} onClick={() => onRestore(slot)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ImageLightbox images={gallery} index={viewing} onIndexChange={setViewing} />
    </div>
  );
};
