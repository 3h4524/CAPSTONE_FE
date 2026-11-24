"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MockupSidesStrip } from "@/components/mockups/mockup-sides-strip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { garmentColorName } from "@/helpers/garment-colors";
import { sideOfTemplate, type TemplateSide, viewOrder } from "@/helpers/mockup-sides";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
import type { MockupView } from "@/types/mockup-templates";
import type { MockupAsset } from "@/types/video-workflow";
import { cn } from "@/utils/cn";

/** Share of the visible width one arrow press moves, so the card at the edge stays in view as an anchor. */
const SCROLL_STEP = 0.85;
const SWATCH_PATTERN = /^#[0-9a-f]{3,8}$/i;

/**
 * A row of cards that scrolls sideways inside its container, never the page. Arrows and edge fades appear only on
 * the side that has more; touch, trackpad, the mouse wheel and the arrow keys (the strip is focusable) all work too.
 */
export const ScrollStrip = ({
  label,
  itemCount,
  children,
}: {
  label: string;
  itemCount: number;
  children: ReactNode;
}) => {
  const stripRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ before: false, after: false });

  const measure = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const before = strip.scrollLeft > 1;
    const after = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
    setEdges((current) =>
      current.before === before && current.after === after ? current : { before, after }
    );
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    // The wheel moves the strip sideways while the pointer is over it; at either end it scrolls the page again.
    // Added by hand: React's wheel handler is passive, so it could not keep the page from scrolling too.
    const wheel = (event: WheelEvent) => {
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const delta = event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY;
      const atStart = strip.scrollLeft <= 0;
      const atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      event.preventDefault();
      strip.scrollBy({ left: delta, behavior: "instant" });
    };
    strip.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      strip.removeEventListener("wheel", wheel);
    };
  }, [measure, itemCount]);

  const { t } = useTranslation("common");
  const scrollBy = (direction: 1 | -1) => {
    const strip = stripRef.current;
    if (!strip) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollBy({
      left: direction * strip.clientWidth * SCROLL_STEP,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  // The arrows sit on the vertical middle of the image (card padding + half the square image), not of the whole card.
  const arrow = (direction: 1 | -1, visible: boolean) => (
    <button
      type="button"
      aria-label={
        direction === 1
          ? t("workflowEditor.mockupStrip.showLater")
          : t("workflowEditor.mockupStrip.showEarlier")
      }
      tabIndex={visible ? 0 : -1}
      onClick={() => scrollBy(direction)}
      className={cn(
        "border-border bg-card/95 text-primary absolute top-[5.5rem] z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border shadow-[0_2px_8px_rgba(39,55,80,0.16)] backdrop-blur-sm",
        "hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
        "transition-[opacity,background-color,color] duration-200 motion-reduce:transition-none",
        direction === 1 ? "right-1.5" : "left-1.5",
        !visible && "pointer-events-none opacity-0"
      )}
    >
      {direction === 1 ? (
        <ChevronRight className="size-4" aria-hidden="true" />
      ) : (
        <ChevronLeft className="size-4" aria-hidden="true" />
      )}
    </button>
  );

  const fade = (side: "before" | "after") => (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 z-[5] w-10 transition-opacity duration-200 motion-reduce:transition-none",
        side === "before"
          ? "from-card left-0 bg-gradient-to-r to-transparent"
          : "from-card right-0 bg-gradient-to-l to-transparent",
        edges[side] ? "opacity-100" : "opacity-0"
      )}
    />
  );

  return (
    <div className="relative">
      <ul
        ref={stripRef}
        aria-label={label}
        tabIndex={0}
        onScroll={measure}
        className={cn(
          "flex snap-x snap-proximity scroll-px-3 gap-3 overflow-x-auto overscroll-x-contain px-3 pt-1 pb-3",
          "[scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]",
          "focus-visible:ring-ring/50 rounded-sm focus-visible:ring-[3px] focus-visible:outline-none"
        )}
      >
        {children}
      </ul>
      {fade("before")}
      {fade("after")}
      {arrow(-1, edges.before)}
      {arrow(1, edges.after)}
    </div>
  );
};

// Same states, colours and layout as the card of a design in the Design Approval step, so both reviews read alike.
const STATE: Record<string, { labelKey: string; className: string }> = {
  approved: {
    labelKey: "workflowEditor.mockupStrip.approved",
    className: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    labelKey: "workflowEditor.mockupStrip.rejected",
    className: "bg-rose-100 text-rose-700",
  },
};
const PENDING_STATE = {
  labelKey: "workflowEditor.mockupStrip.toReview",
  className: "bg-ink-100 text-ink-600",
};

/**
 * One mock-up in a design's strip: large enough to judge at a glance, with approve / reject one tap away. Read only
 * (`readOnly`) once the videos started: it shows the decision without offering to change it.
 */
export const MockupStripCard = ({
  asset,
  readOnly = false,
}: {
  asset: MockupAsset;
  readOnly?: boolean;
}) => {
  const { t } = useTranslation("common");
  const { mutate: review, isPending } = useReviewMockupAsset();
  const approved = asset.approvalStatus === "approved";
  const rejected = asset.approvalStatus === "rejected";
  const state = STATE[asset.approvalStatus] ?? PENDING_STATE;
  const stateLabel = t(state.labelKey);
  const swatch =
    asset.variantKey && SWATCH_PATTERN.test(asset.variantKey) ? asset.variantKey : null;
  const decide = (next: boolean) =>
    review({ id: asset.id, revision: asset.revision, approved: next });

  return (
    <li
      className={cn(
        "bg-card flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-lg border",
        approved && "border-emerald-300",
        rejected && "border-rose-300 opacity-70"
      )}
    >
      <Image
        src={asset.previewUrl}
        alt={t("workflowEditor.mockupStrip.alt", {
          role: asset.role,
          state: stateLabel.toLowerCase(),
        })}
        width={asset.width}
        height={asset.height}
        unoptimized
        className="bg-muted aspect-square w-full object-contain p-1"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <p className="text-foreground flex items-center gap-1.5 text-xs font-medium">
          {swatch && (
            <span
              className="border-ink-300 size-3 shrink-0 rounded-full border"
              style={{ backgroundColor: swatch }}
              aria-hidden="true"
            />
          )}
          <span className="truncate" title={swatch ? `${asset.role} · ${swatch}` : asset.role}>
            {asset.role}
          </span>
        </p>
        {asset.warnings.length > 0 && (
          <p
            className="bg-warning text-warning-foreground flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] leading-tight"
            title={asset.warnings.join(" ")}
          >
            <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{asset.warnings[0]}</span>
          </p>
        )}
        {/* Pinned to the bottom, so every card in the strip has its buttons on the same line, warning or not. */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
              state.className
            )}
          >
            {stateLabel}
          </span>
          {!readOnly && (
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant={approved ? "default" : "outline"}
                size="icon-sm"
                aria-label={t("workflowEditor.mockupStrip.approveMockup")}
                aria-pressed={approved}
                title={t("workflowEditor.mockupStrip.approve")}
                disabled={isPending || approved}
                onClick={() => decide(true)}
                className="disabled:opacity-100"
              >
                <Check aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant={rejected ? "destructive" : "outline"}
                size="icon-sm"
                aria-label={t("workflowEditor.mockupStrip.rejectMockup")}
                aria-pressed={rejected}
                title={t("workflowEditor.mockupStrip.reject")}
                disabled={isPending || rejected}
                onClick={() => decide(false)}
                className="disabled:opacity-100"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

/** One garment color of a product card: the mock-ups of its sides, front first. */
export type ProductMockupColor = {
  key: string;
  hex: string | null;
  sides: { view: MockupView; asset: MockupAsset }[];
};

/** The mock-ups made on one garment template for a design: every color, each with its sides. */
export type ProductMockupCard = { key: string; templateId: string | null; colors: ProductMockupColor[] };

/**
 * The composites of a design as product cards, the way Apply mock-up shows them: the sides of one garment template go
 * on one card, one color at a time. A mock-up whose template is not known, or a second picture of the same side, has a
 * card of its own.
 */
export const groupProductMockups = (
  assets: MockupAsset[],
  index: ReadonlyMap<string, TemplateSide>
): ProductMockupCard[] => {
  const cards = new Map<string, ProductMockupCard>();
  for (const asset of assets) {
    const side = asset.mockupTemplateId ? sideOfTemplate(index, asset.mockupTemplateId) : undefined;
    const view = side?.view ?? "front";
    const colorKey = asset.variantKey ?? "";
    let card = cards.get(side?.mainId ?? asset.id);
    let color = card?.colors.find((item) => item.key === colorKey);
    if (!card || !side || color?.sides.some((item) => item.view === view)) {
      card = { key: side && !card ? side.mainId : asset.id, templateId: side?.mainId ?? null, colors: [] };
      color = undefined;
    }
    if (!color) {
      color = { key: colorKey, hex: SWATCH_PATTERN.test(colorKey) ? colorKey : null, sides: [] };
      card.colors.push(color);
    }
    color.sides.push({ view, asset });
    cards.set(card.key, card);
  }
  return [...cards.values()].map((card) => ({
    ...card,
    colors: card.colors.map((color) => ({
      ...color,
      sides: [...color.sides].sort((a, b) => viewOrder(a.view) - viewOrder(b.view)),
    })),
  }));
};

const SIDE_KEYS: Record<MockupView, string> = {
  front: "workflowEditor.mockupStrip.views.front",
  back: "workflowEditor.mockupStrip.views.back",
  left: "workflowEditor.mockupStrip.views.left",
  right: "workflowEditor.mockupStrip.views.right",
  side: "workflowEditor.mockupStrip.views.side",
};

/** The status of some mock-ups together: approved or rejected when all of them are, else still to review. */
const statusOf = (assets: MockupAsset[]) =>
  assets.length > 0 && assets.every((asset) => asset.approvalStatus === "approved")
    ? "approved"
    : assets.length > 0 && assets.every((asset) => asset.approvalStatus === "rejected")
      ? "rejected"
      : "pending";

/** Choosing the colors a product is sold in, at Mockup Approval: each color goes with every side of it. */
export type ProductColorChoice = {
  isOff: (colorKey: string) => boolean;
  toggle: (colorKey: string) => void;
  /** False while the color is the only one left on in the design: skipping the product leaves it out instead. */
  canTurnOff: boolean;
};

/**
 * A product on one garment template. It is approved or skipped as a whole, every side together, so its sides are only
 * there to look at, picked under the picture as on Apply mock-up. With `choice`, a color can be left out of it.
 */
export const ProductMockupCard = ({
  card,
  name,
  choice,
}: {
  card: ProductMockupCard;
  name: string;
  choice?: ProductColorChoice;
}) => {
  const { t } = useTranslation("common");
  const [colorKey, setColorKey] = useState(card.colors[0]?.key);
  const [view, setView] = useState<MockupView>("front");
  const color = card.colors.find((item) => item.key === colorKey) ?? card.colors[0];
  const shown = color.sides.find((side) => side.view === view) ?? color.sides[0];
  const isOff = (key: string) => choice?.isOff(key) ?? false;
  const onColors = card.colors.filter((item) => !isOff(item.key));
  const status = statusOf(onColors.flatMap((item) => item.sides.map((side) => side.asset)));
  const shownOff = isOff(color.key);
  const state = shownOff
    ? { labelKey: "workflowEditor.mockupStrip.leftOut", className: STATE.rejected.className }
    : (STATE[statusOf(color.sides.map((side) => side.asset))] ?? PENDING_STATE);
  const stateLabel = t(state.labelKey);
  const withSides = card.colors.some((item) => item.sides.length > 1);
  const sideLabel = withSides ? t(SIDE_KEYS[shown.view]) : null;
  const warnings = [...new Set(color.sides.flatMap((side) => side.asset.warnings))];
  const colorName = (item: ProductMockupColor) =>
    item.hex ? garmentColorName(item.hex) : t("workflowEditor.mockupStrip.photoColor");

  return (
    <li
      className={cn(
        "bg-card flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-lg border",
        status === "approved" && onColors.length > 0 && "border-emerald-300",
        (onColors.length === 0 || status === "rejected") && "border-rose-300"
      )}
    >
      <Image
        src={shown.asset.previewUrl}
        alt={t("workflowEditor.mockupStrip.alt", {
          role: sideLabel ? `${name} (${sideLabel.toLowerCase()})` : name,
          state: stateLabel.toLowerCase(),
        })}
        width={shown.asset.width}
        height={shown.asset.height}
        unoptimized
        className={cn(
          "bg-muted aspect-square w-full object-contain p-1 transition-opacity",
          shownOff && "opacity-40 grayscale"
        )}
      />
      {(card.colors.length > 1 || withSides) && (
        <div className="bg-ink-50 flex flex-col items-center gap-1.5 border-y px-2 py-1.5">
          {card.colors.length > 1 && (
            <div
              role="tablist"
              aria-label={t("workflowEditor.mockupStrip.colors")}
              className="flex flex-wrap justify-center gap-1.5"
            >
              {card.colors.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={item.key === color.key}
                  aria-label={t("workflowEditor.mockupStrip.showIn", { name: colorName(item) })}
                  title={
                    isOff(item.key)
                      ? t("workflowEditor.mockupStrip.colorLeftOut", { name: colorName(item) })
                      : colorName(item)
                  }
                  onClick={() => setColorKey(item.key)}
                  className={cn(
                    "border-ink-300 relative size-5 shrink-0 rounded-full border transition",
                    item.key === color.key
                      ? "ring-2 ring-slate-900 ring-offset-1"
                      : "hover:border-slate-500",
                    !item.hex && "bg-card",
                    // A color left out is crossed out, so it never reads as just another shade.
                    isOff(item.key) &&
                      "opacity-50 after:absolute after:top-1/2 after:left-1/2 after:h-0.5 after:w-6 after:-translate-x-1/2 after:-translate-y-1/2 after:-rotate-45 after:rounded-full after:bg-rose-600"
                  )}
                  style={item.hex ? { backgroundColor: item.hex } : undefined}
                />
              ))}
            </div>
          )}
          {withSides && (
            <MockupSidesStrip
              size="sm"
              className="bg-ink-50 justify-center rounded-none border-0 p-0 shadow-none"
              active={shown.view}
              onSelect={setView}
              sides={color.sides.map((side) => ({
                view: side.view,
                thumbnail: side.asset.previewUrl,
                title: t(SIDE_KEYS[side.view]),
              }))}
            />
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <p className="text-foreground truncate text-xs font-medium" title={name}>
          {name}
        </p>
        {choice && (
          <label
            className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
            title={
              !shownOff && !choice.canTurnOff ? t("workflowEditor.mockupStrip.lastColor") : undefined
            }
          >
            <Checkbox
              checked={!shownOff}
              disabled={!shownOff && !choice.canTurnOff}
              onCheckedChange={() => choice.toggle(color.key)}
            />
            <span className="truncate">
              {t("workflowEditor.mockupStrip.sellColor", { name: colorName(color) })}
            </span>
          </label>
        )}
        {warnings.length > 0 && (
          <p
            className="bg-warning text-warning-foreground flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] leading-tight"
            title={warnings.join(" ")}
          >
            <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{warnings[0]}</span>
          </p>
        )}
        <div className="mt-auto flex items-center">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
              state.className
            )}
          >
            {stateLabel}
          </span>
        </div>
      </div>
    </li>
  );
};

/** Placeholder cards while a product's mock-ups load, the size of the real ones so nothing jumps. */
export const MockupStripSkeleton = () => {
  const { t } = useTranslation("common");
  return (
    <div
      className="flex gap-3 overflow-hidden px-3 pt-1 pb-3"
      aria-busy="true"
      aria-label={t("workflowEditor.mockupStrip.loading")}
    >
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="bg-card w-44 shrink-0 animate-pulse overflow-hidden rounded-lg border motion-reduce:animate-none"
        >
          <div className="bg-muted aspect-square" />
          <div className="space-y-2 p-2">
            <div className="bg-muted h-3 w-16 rounded" />
            <div className="bg-muted h-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};
