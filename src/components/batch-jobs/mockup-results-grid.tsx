"use client";

import Image from "next/image";

import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import type { GenerateAllMockupsResult } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupResultsGridProps = {
  result: GenerateAllMockupsResult;
  productNameById: Map<string | null, string>;
  /** Column classes of the image grid; a side panel passes fewer columns. */
  columnsClassName?: string;
};

export const MockupResultsGrid = ({
  result,
  productNameById,
  columnsClassName = "grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
}: MockupResultsGridProps) => (
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
        {result.images.map((mockupImage) => (
          <a
            key={mockupImage.id}
            href={mockupImage.mockupImageUrl}
            target="_blank"
            rel="noreferrer"
            className="group block overflow-hidden rounded-lg border"
          >
            <Image
              src={mockupImage.mockupImageUrl}
              alt={productNameById.get(mockupImage.productId) ?? "Mock-up"}
              width={mockupImage.mockupWidthPx}
              height={mockupImage.mockupHeightPx}
              unoptimized
              className="bg-muted aspect-square w-full object-cover transition group-hover:scale-105"
            />
            <p className="text-muted-foreground flex items-center gap-1.5 p-2 text-xs">
              {mockupImage.garmentColor && <GarmentColorSwatch hex={mockupImage.garmentColor} />}
              <span className="truncate">{productNameById.get(mockupImage.productId) ?? "Product"}</span>
            </p>
          </a>
        ))}
      </div>
    )}
  </div>
);
