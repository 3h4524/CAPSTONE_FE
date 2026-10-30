"use client";

import { useState } from "react";
import Image from "next/image";
import { CircleAlert, RefreshCw } from "lucide-react";

import { ImageLightbox } from "@/components/commons/data-display/image-lightbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { designLightboxImages } from "@/helpers/lightbox-images";
import { productTypeLabel } from "@/helpers/mockup-template";
import type { BatchJobProductResult } from "@/types/batch-jobs";
import { cn } from "@/utils/cn";

export type MockupPreviewTarget = { designImageId: string; designImageUrl: string; productName: string; productType: string };

type GeneratedImagesGridProps = {
  products: BatchJobProductResult[];
  onPreview: (target: MockupPreviewTarget) => void;
  /** Column classes of each product's grid; a side panel passes fewer columns. */
  columnsClassName?: string;
  /** Offers to change a product's prompt and generate it again; without it the grid is view-only. */
  onRegenerate?: (product: BatchJobProductResult) => void;
  /** True while the job is still generating, when no product can be generated again yet. */
  regenerateDisabled?: boolean;
};

// A product whose designs are being made right now, the first time or again.
const IN_PROGRESS_STATUSES = ["queued", "generating_image"];

/**
 * A product the results show: one with designs, or one left without any, which is shown with the reason so it can be
 * changed and generated again (every design blocked as a possible brand or character, for one).
 */
export const shownInResults = (product: BatchJobProductResult) => product.images.length > 0 || product.status === "failed";

// SRS 3.5.12 Generated Image Review: every product's designs with a mock-up preview, and, where offered, a way to
// generate a product again.
export const GeneratedImagesGrid = ({
  products,
  onPreview,
  columnsClassName = "grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
  onRegenerate,
  regenerateDisabled = false,
}: GeneratedImagesGridProps) => {
  const [viewing, setViewing] = useState<number | null>(null);
  const shown = products.filter(shownInResults);
  const gallery = designLightboxImages(shown.filter((product) => product.images.length > 0));

  return (
    <div className="space-y-6">
      {shown.map((product) => (
        <div key={product.id}>
          <div className="mb-3 flex items-center gap-2">
            <h4 className="min-w-0 truncate text-sm font-medium text-slate-900">{product.productName}</h4>
            {product.productType && <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">{productTypeLabel(product.productType)}</Badge>}
            {onRegenerate &&
              (IN_PROGRESS_STATUSES.includes(product.status) ? (
                <span className="text-muted-foreground ml-auto shrink-0 text-xs">Generating new designs…</span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7 shrink-0 gap-1 px-2 text-xs whitespace-nowrap"
                  disabled={regenerateDisabled}
                  onClick={() => onRegenerate(product)}
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Edit &amp; regenerate
                </Button>
              ))}
          </div>
          {/* Why the product has no designs, or how many of them the provider blocked; not while it is being made again. */}
          {product.errorMessage && !IN_PROGRESS_STATUSES.includes(product.status) && (
            <p
              role={product.images.length === 0 ? "alert" : undefined}
              className={cn(
                "mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed",
                product.images.length === 0
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              )}
            >
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{product.errorMessage}</span>
            </p>
          )}
          {product.images.length > 0 && (
            <div className={cn("grid", columnsClassName)}>
              {/* Numbered by position: older rows were stored with duplicate variation indexes. */}
              {product.images.map((image, position) => (
                <div key={image.id} className="overflow-hidden rounded-lg border">
                  {/* Opens the design large on the page rather than in a new tab. */}
                  <Button
                    type="button"
                    variant="none"
                    aria-label={`View ${product.productName}, variation ${position + 1} larger`}
                    onClick={() => setViewing(gallery.findIndex((item) => item.id === image.id))}
                    className="group block h-auto w-full cursor-zoom-in overflow-hidden rounded-none p-0 hover:translate-y-0"
                  >
                    <Image
                      src={image.imageUrl}
                      alt={`${product.productName}, variation ${position + 1}`}
                      width={image.widthPx || 512}
                      height={image.heightPx || 512}
                      unoptimized
                      className="bg-muted aspect-square w-full object-cover transition group-hover:scale-105"
                    />
                  </Button>
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
          )}
        </div>
      ))}
      <ImageLightbox images={gallery} index={viewing} onIndexChange={setViewing} />
    </div>
  );
};
