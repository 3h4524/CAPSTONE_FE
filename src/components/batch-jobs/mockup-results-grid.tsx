"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";

import { HorizontalStrip } from "@/components/commons/data-display/horizontal-strip";
import { ImageLightbox } from "@/components/commons/data-display/image-lightbox";
import { GarmentColorSwatch } from "@/components/mockups/garment-color-picker";
import { MockupSidesStrip } from "@/components/mockups/mockup-sides-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockupLightboxImages } from "@/helpers/lightbox-images";
import { groupMockupSides, templateSidesIndex } from "@/helpers/mockup-sides";
import { mockupViewLabel } from "@/helpers/mockup-template";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import type {
  GenerateAllMockupsResult,
  MockupImage,
  MockupView,
  RemovedMockupSlot,
} from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

type MockupResultsGridProps = {
  result: GenerateAllMockupsResult;
  productNameById: Map<string | null, string>;
  /** Column classes of the image grid; a side panel passes fewer columns. */
  columnsClassName?: string;
  /** One row that scrolls sideways instead of a grid, so many mock-ups take little height in a side panel. */
  strip?: boolean;
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
  strip = false,
  onEdit,
  onRestore,
  disabled = false,
}: MockupResultsGridProps) => {
  const [viewing, setViewing] = useState<number | null>(null);
  // The side each card shows; its front until another is picked.
  const [shownViews, setShownViews] = useState<Record<string, MockupView>>({});
  const gallery = mockupLightboxImages(result.images, productNameById);
  // The front, back and sleeves of one design on one template go on one card.
  const { data: templates } = useMockupTemplates();
  const cards = groupMockupSides(result.images, templateSidesIndex(templates ?? []));
  const withSides = cards.some((card) => card.sides.length > 1);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Generated {result.generatedCount} new mock-up{result.generatedCount === 1 ? "" : "s"}.
        {withSides &&
          " Each card holds a design’s front and other sides: pick one under its picture."}
        {strip &&
          cards.length > 1 &&
          ` ${cards.length} shown: scroll sideways or click one to view them large.`}
        {result.noDesignImageCount > 0 &&
          ` ${result.noDesignImageCount} products have no image yet.`}
        {result.noCompatibleTemplateCount > 0 &&
          ` ${result.noCompatibleTemplateCount} products have no matching template.`}
        {(result.noApprovedImageCount ?? 0) > 0 &&
          ` ${result.noApprovedImageCount} products have no approved design.`}
      </p>
      {result.errors.length > 0 && (
        <ul className="text-destructive space-y-1 text-xs">
          {result.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
      {cards.length > 0 && (
        <ImagesLayout strip={strip} count={cards.length} columnsClassName={columnsClassName}>
          {cards.map((card) => {
            const shown =
              card.sides.find((side) => side.view === shownViews[card.key]) ?? card.sides[0];
            const mockupImage = shown.image;
            const imageIndex = result.images.findIndex((item) => item.id === mockupImage.id);
            const productName = productNameById.get(mockupImage.productId) ?? "Product";
            const sideName =
              card.sides.length > 1 ? ` (${mockupViewLabel(shown.view).toLowerCase()})` : "";
            return (
              <div
                key={card.key}
                className={cn(
                  "group overflow-hidden rounded-lg border",
                  strip && "w-40 shrink-0 snap-start"
                )}
              >
                <div>
                  {/* Opens the mock-up large on the page rather than in a new tab. */}
                  <Button
                    type="button"
                    variant="none"
                    aria-label={`View the mock-up of ${productName}${sideName} larger`}
                    onClick={() => setViewing(imageIndex)}
                    className="block h-auto w-full cursor-zoom-in overflow-hidden rounded-none p-0 hover:translate-y-0"
                  >
                    <Image
                      src={mockupImage.mockupImageUrl}
                      alt={`${productNameById.get(mockupImage.productId) ?? "Mock-up"}${sideName}`}
                      width={mockupImage.mockupWidthPx}
                      height={mockupImage.mockupHeightPx}
                      unoptimized
                      className="bg-muted aspect-square w-full object-cover transition group-hover:scale-105"
                    />
                  </Button>
                  {/* Under the picture, so it never covers the garment. */}
                  {card.sides.length > 1 && (
                    <MockupSidesStrip
                      size="sm"
                      className="justify-center rounded-none border-0 border-b bg-slate-50 px-2 py-1.5 shadow-none"
                      active={shown.view}
                      onSelect={(view) =>
                        setShownViews((current) => ({ ...current, [card.key]: view }))
                      }
                      sides={card.sides.map((side) => ({
                        view: side.view,
                        thumbnail: side.image.mockupImageUrl,
                      }))}
                    />
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5 p-2 text-xs">
                  {mockupImage.garmentColor && (
                    <GarmentColorSwatch hex={mockupImage.garmentColor} />
                  )}
                  <span className="min-w-0 flex-1 truncate">{productName}</span>
                  {card.sides.some((side) => side.image.override) && (
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-50 text-slate-700"
                    >
                      Edited
                    </Badge>
                  )}
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
        </ImagesLayout>
      )}
      {onRestore && result.removed && result.removed.length > 0 && (
        <section
          className="space-y-1.5 rounded-lg border border-dashed p-3 text-xs"
          aria-label="Removed mock-ups"
        >
          <p className="font-medium text-slate-700">Removed for single products</p>
          <ul className="space-y-1">
            {result.removed.map((slot) => (
              <li key={slot.slotKey} className="flex items-center gap-1.5">
                {slot.garmentColor && <GarmentColorSwatch hex={slot.garmentColor} />}
                <span className="text-muted-foreground min-w-0 flex-1 truncate">
                  {productNameById.get(slot.productId) ?? "Product"} · {slot.templateName}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  disabled={disabled}
                  onClick={() => onRestore(slot)}
                >
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

// The mock-ups as one row that scrolls sideways (a side panel), or as a grid.
const ImagesLayout = ({
  strip,
  count,
  columnsClassName,
  children,
}: {
  strip: boolean;
  count: number;
  columnsClassName: string;
  children: ReactNode;
}) =>
  strip ? (
    <HorizontalStrip itemsLabel="mock-ups" itemCount={count}>
      {children}
    </HorizontalStrip>
  ) : (
    <div className={cn("grid", columnsClassName)}>{children}</div>
  );
