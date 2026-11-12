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
import { garmentColorName } from "@/helpers/garment-colors";
import { mockupLightboxImages } from "@/helpers/lightbox-images";
import {
  cardColor,
  groupMockupColors,
  groupMockupSides,
  slotSide,
  templateSidesIndex,
  viewOrder,
} from "@/helpers/mockup-sides";
import { mockupViewLabel, withViewTemplates } from "@/helpers/mockup-template";
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
  /** Puts back mock-ups that were removed for their product alone: one, or the sides of one card together. */
  onRestore?: (slots: RemovedMockupSlot[]) => void;
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
  // The side each color shows; its front until another is picked.
  const [shownViews, setShownViews] = useState<Record<string, MockupView>>({});
  // The color each card shows, by the key of that color's sides; its first color until another is picked.
  const [shownColors, setShownColors] = useState<Record<string, string>>({});
  const gallery = mockupLightboxImages(result.images, productNameById);
  // The front, back and sleeves of one design on one template go on one card.
  const { data: templates } = useMockupTemplates();
  const sidesIndex = templateSidesIndex(templates ?? []);
  const cards = groupMockupSides(result.images, sidesIndex);
  // Every garment color of one design on one template goes on one card too, picked under its picture.
  const groups = groupMockupColors(cards);
  const withSides = cards.some((card) => card.sides.length > 1);
  const withColors = groups.some((group) => group.colors.length > 1);
  const templatesById = new Map(withViewTemplates(templates ?? []).map((item) => [item.id, item]));
  const photoOf = (templateId: string) => {
    const photo = templatesById.get(templateId);
    return photo?.previewImageUrl ?? photo?.baseImageUrl ?? null;
  };
  // A removed side stays on its card, faded, so the card still shows which sides it has.
  const removed = (result.removed ?? []).map((slot) => ({
    slot,
    side: slotSide(slot.productId, slot.slotKey, sidesIndex),
  }));
  const removedOnCard = (cardKey: string) =>
    removed.flatMap(({ slot, side }) =>
      side?.cardKey === cardKey ? [{ slot, view: side.view }] : []
    );
  // The mock-up as it was, or the template's photo when it can't be shown.
  const pictureOf = (slot: RemovedMockupSlot) =>
    slot.mockupImageUrl ?? photoOf(slot.mockupTemplateId);
  // The removed sides of one card go on one row, front first, and come back together.
  const removedRows = [
    ...removed
      .reduce((rows, item) => {
        const key = item.side?.cardKey ?? item.slot.slotKey;
        rows.set(key, [...(rows.get(key) ?? []), item]);
        return rows;
      }, new Map<string, typeof removed>())
      .entries(),
  ].map(([key, items]) => ({
    key,
    items: [...items].sort(
      (a, b) => viewOrder(a.side?.view ?? "front") - viewOrder(b.side?.view ?? "front")
    ),
  }));
  // "Product · Template"; when the card is still shown with its other sides, the removed ones are named.
  const removedName = ({ key, items }: (typeof removedRows)[number]) => {
    const [{ slot, side }] = items;
    const main = side ? templatesById.get(side.mainId) : undefined;
    const partly = cards.some((card) => card.key === key);
    const sides = partly
      ? ` · ${items.map((item) => mockupViewLabel(item.side?.view ?? "front")).join(", ")}`
      : "";
    return `${productNameById.get(slot.productId) ?? "Product"} · ${main?.name ?? slot.templateName}${sides}`;
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Generated {result.generatedCount} new mock-up{result.generatedCount === 1 ? "" : "s"}.
        {(withSides || withColors) &&
          ` Each card holds a design’s ${withColors ? "garment colors" : ""}${withColors && withSides ? " and " : ""}${withSides ? "front and other sides" : ""}: pick one under its picture.`}
        {strip &&
          groups.length > 1 &&
          ` ${groups.length} shown: scroll sideways or click one to view them large.`}
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
      {groups.length > 0 && (
        <ImagesLayout strip={strip} count={groups.length} columnsClassName={columnsClassName}>
          {groups.map((group) => {
            const card =
              group.colors.find((item) => item.key === shownColors[group.key]) ?? group.colors[0];
            const shown =
              card.sides.find((side) => side.view === shownViews[card.key]) ?? card.sides[0];
            const mockupImage = shown.image;
            const imageIndex = result.images.findIndex((item) => item.id === mockupImage.id);
            const productName = productNameById.get(mockupImage.productId) ?? "Product";
            const removedSides = removedOnCard(card.key);
            const sideName =
              card.sides.length + removedSides.length > 1
                ? ` (${mockupViewLabel(shown.view).toLowerCase()})`
                : "";
            const stripSides = [
              ...card.sides.map((side) => ({
                view: side.view,
                thumbnail: side.image.mockupImageUrl,
              })),
              ...removedSides.map(({ slot, view }) => ({
                view,
                thumbnail: pictureOf(slot),
                removed: true,
                title: `${mockupViewLabel(view)}: removed${onRestore ? ". Click to put it back" : ""}`,
              })),
            ].sort((a, b) => viewOrder(a.view) - viewOrder(b.view));
            const chooseSide = (view: MockupView) => {
              const gone = removedSides.find((item) => item.view === view);
              if (!gone) setShownViews((current) => ({ ...current, [card.key]: view }));
              else if (onRestore && !disabled) onRestore([gone.slot]);
            };
            return (
              <div
                key={group.key}
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
                  {/* Under the picture, so they never cover the garment. */}
                  {group.colors.length > 1 && (
                    <div
                      role="tablist"
                      aria-label="Garment colors"
                      className="bg-ink-50 flex flex-wrap justify-center gap-1.5 border-b px-2 py-1.5"
                    >
                      {group.colors.map((item) => {
                        const hex = cardColor(item);
                        const name = hex ? garmentColorName(hex) : "Photo’s own color";
                        return (
                          <button
                            key={item.key}
                            type="button"
                            role="tab"
                            aria-selected={item.key === card.key}
                            aria-label={`Show in ${name}`}
                            title={name}
                            onClick={() =>
                              setShownColors((current) => ({ ...current, [group.key]: item.key }))
                            }
                            className={cn(
                              "border-ink-300 size-5 shrink-0 rounded-full border transition",
                              item.key === card.key
                                ? "ring-2 ring-slate-900 ring-offset-1"
                                : "hover:border-slate-500",
                              !hex && "bg-card"
                            )}
                            style={hex ? { backgroundColor: hex } : undefined}
                          />
                        );
                      })}
                    </div>
                  )}
                  {stripSides.length > 1 && (
                    <MockupSidesStrip
                      size="sm"
                      className="bg-ink-50 justify-center rounded-none border-0 border-b px-2 py-1.5 shadow-none"
                      active={shown.view}
                      onSelect={chooseSide}
                      sides={stripSides}
                    />
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5 p-2 text-xs">
                  {mockupImage.garmentColor && group.colors.length === 1 && (
                    <GarmentColorSwatch hex={mockupImage.garmentColor} />
                  )}
                  <span className="min-w-0 flex-1 truncate">{productName}</span>
                  {group.colors.some((item) => item.sides.some((side) => side.image.override)) && (
                    <Badge
                      variant="outline"
                      className="border-ink-200 bg-ink-50 text-ink-700"
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
                      title={
                        group.colors.length > 1
                          ? "Edit this mock-up in all its colors"
                          : "Edit this mock-up only"
                      }
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
          <p className="text-ink-700 font-medium">Removed for single products</p>
          <ul className="space-y-1.5">
            {removedRows.map((row) => {
              return (
                <li key={row.key} className="flex items-center gap-2">
                  {/* Each removed side as it looked. */}
                  <span className="flex shrink-0 gap-1">
                    {row.items.map(({ slot: side }) => {
                      const picture = pictureOf(side);
                      return picture ? (
                        <Image
                          key={side.slotKey}
                          src={picture}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="bg-card size-10 rounded-md border object-cover"
                        />
                      ) : (
                        <span
                          key={side.slotKey}
                          aria-hidden="true"
                          className="bg-ink-50 size-10 rounded-md border border-dashed"
                        />
                      );
                    })}
                  </span>
                  <span
                    className="text-muted-foreground min-w-0 flex-1 truncate"
                    title={removedName(row)}
                  >
                    {removedName(row)}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-xs"
                    disabled={disabled}
                    onClick={() => onRestore(row.items.map((item) => item.slot))}
                  >
                    Restore
                  </Button>
                </li>
              );
            })}
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
