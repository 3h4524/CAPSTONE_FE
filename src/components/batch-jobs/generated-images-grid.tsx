"use client";

import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { productTypeLabel } from "@/helpers/mockup-template";
import type { BatchJobProductResult } from "@/types/batch-jobs";
import { cn } from "@/utils/cn";

export type MockupPreviewTarget = { designImageId: string; designImageUrl: string; productName: string; productType: string };

type GeneratedImagesGridProps = {
  products: BatchJobProductResult[];
  onPreview: (target: MockupPreviewTarget) => void;
  /** Column classes of each product's grid; a side panel passes fewer columns. */
  columnsClassName?: string;
};

// SRS 3.5.12 Generated Image Review, view-only: every product's designs with a mock-up preview.
export const GeneratedImagesGrid = ({
  products,
  onPreview,
  columnsClassName = "grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
}: GeneratedImagesGridProps) => (
  <div className="space-y-6">
    {products
      .filter((product) => product.images.length > 0)
      .map((product) => (
        <div key={product.id}>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="min-w-0 truncate font-medium">{product.productName}</h3>
            {product.productType && <Badge variant="secondary">{productTypeLabel(product.productType)}</Badge>}
          </div>
          <div className={cn("grid", columnsClassName)}>
            {/* Numbered by position: older rows were stored with duplicate variation indexes. */}
            {product.images.map((image, position) => (
              <div key={image.id} className="overflow-hidden rounded-lg border">
                <a href={image.imageUrl} target="_blank" rel="noreferrer" className="group block">
                  <Image
                    src={image.imageUrl}
                    alt={`${product.productName}, variation ${position + 1}`}
                    width={image.widthPx || 512}
                    height={image.heightPx || 512}
                    unoptimized
                    className="bg-muted aspect-square w-full object-cover transition group-hover:scale-105"
                  />
                </a>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 p-2">
                  <p className="text-muted-foreground text-xs whitespace-nowrap">Variation {position + 1}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs whitespace-nowrap"
                    onClick={() =>
                      onPreview({ designImageId: image.id, designImageUrl: image.imageUrl, productName: product.productName, productType: product.productType })
                    }
                  >
                    Preview on mock-up
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
  </div>
);
