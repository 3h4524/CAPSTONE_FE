"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HorizontalStrip } from "@/components/commons/data-display/horizontal-strip";
import { ImageLightbox } from "@/components/commons/data-display/image-lightbox";
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
  const { t } = useTranslation("common");
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
  // Every card has the same rows, so their names and edit buttons line up across the row.
  const showColorRow = groups.some((group) => group.colors.length > 1 || Boolean(cardColor(group.colors[0])));
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
    return `${productNameById.get(slot.productId) ?? t("batchJobs.mockups.product")} · ${main?.name ?? slot.templateName}${sides}`;
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t("batchJobs.mockups.generated", { count: result.generatedCount })}
        {(withSides || withColors) &&
          ` ${t(
            withColors && withSides
              ? "batchJobs.mockups.cardHoldsBoth"
              : withColors
                ? "batchJobs.mockups.cardHoldsColors"
                : "batchJobs.mockups.cardHoldsSides"
          )}`}
        {strip && groups.length > 1 && ` ${t("batchJobs.mockups.shownCount", { count: groups.length })}`}
        {result.noDesignImageCount > 0 && ` ${t("batchJobs.mockups.noImage", { count: result.noDesignImageCount })}`}
        {result.noCompatibleTemplateCount > 0 &&
          ` ${t("batchJobs.mockups.noTemplate", { count: result.noCompatibleTemplateCount })}`}
        {(result.noApprovedImageCount ?? 0) > 0 &&
          ` ${t("batchJobs.mockups.noApproved", { count: result.noApprovedImageCount })}`}
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
            const productName = productNameById.get(mockupImage.productId) ?? t("batchJobs.mockups.product");
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
                title: onRestore
                  ? t("batchJobs.mockups.removedRestorable", { side: mockupViewLabel(view) })
                  : t("batchJobs.mockups.removedSide", { side: mockupViewLabel(view) }),
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
                  "group flex flex-col overflow-hidden rounded-lg border",
                  strip && "w-40 shrink-0 snap-start"
                )}
              >
                <div className="flex flex-1 flex-col">
                  {/* Opens the mock-up large on the page rather than in a new tab. */}
                  <Button
                    type="button"
                    variant="none"
                    aria-label={t("batchJobs.mockups.viewLarger", { name: `${productName}${sideName}` })}
                    onClick={() => setViewing(imageIndex)}
                    className="block h-auto w-full cursor-zoom-in overflow-hidden rounded-none p-0 hover:translate-y-0"
                  >
                    <Image
                      src={mockupImage.mockupImageUrl}
                      alt={`${productNameById.get(mockupImage.productId) ?? t("batchJobs.mockups.mockup")}${sideName}`}
                      width={mockupImage.mockupWidthPx}
                      height={mockupImage.mockupHeightPx}
                      unoptimized
                      className="bg-muted aspect-square w-full object-cover transition group-hover:scale-105"
                    />
                  </Button>
                  {/* Under the picture, so they never cover the garment. */}
                  <div className="bg-ink-50 flex-1 border-b">
                    {showColorRow && (
                      <div
                        role="tablist"
                        aria-label={t("batchJobs.mockups.garmentColors")}
                        className="flex flex-wrap justify-center gap-1.5 border-b px-2 py-1.5"
                      >
                        {group.colors.map((item) => {
                          const hex = cardColor(item);
                          const name = hex ? garmentColorName(hex) : t("batchJobs.mockups.photoColor");
                          return (
                            <button
                              key={item.key}
                              type="button"
                              role="tab"
                              aria-selected={item.key === card.key}
                              aria-label={t("batchJobs.mockups.showIn", { name })}
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
                    <MockupSidesStrip
                      size="sm"
                      className="bg-ink-50 justify-center rounded-none border-0 px-2 py-1.5 shadow-none"
                      active={shown.view}
                      onSelect={chooseSide}
                      sides={stripSides}
                    />
                  </div>
                </div>
                <div className="text-muted-foreground flex min-h-12 items-center gap-1.5 p-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">{productName}</span>
                  {group.colors.some((item) => item.sides.some((side) => side.image.override)) && (
                    <Badge
                      variant="outline"
                      className="border-ink-200 bg-ink-50 text-ink-700"
                    >
                      {t("batchJobs.mockups.edited")}
                    </Badge>
                  )}
                  {onEdit && mockupImage.slotKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("batchJobs.mockups.editOf", { name: productName })}
                      title={
                        group.colors.length > 1
                          ? t("batchJobs.mockups.editAllColors")
                          : t("batchJobs.mockups.editOnly")
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
          aria-label={t("batchJobs.mockups.removed")}
        >
          <p className="text-ink-700 font-medium">{t("batchJobs.mockups.removedTitle")}</p>
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
                    {t("batchJobs.mockups.restore")}
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
}) => {
  const { t } = useTranslation("common");
  return strip ? (
    <HorizontalStrip itemsLabel={t("batchJobs.mockups.itemsLabel")} itemCount={count}>
      {children}
    </HorizontalStrip>
  ) : (
    <div className={cn("grid", columnsClassName)}>{children}</div>
  );
};
