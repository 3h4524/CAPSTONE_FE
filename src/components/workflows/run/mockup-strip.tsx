"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useReviewMockupAsset } from "@/hooks/mutations/use-review-mockup-asset";
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
      aria-label={direction === 1 ? "Show later mock-ups" : "Show earlier mock-ups"}
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
const STATE: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-700" },
};
const PENDING_STATE = { label: "To review", className: "bg-ink-100 text-ink-600" };

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
  const { mutate: review, isPending } = useReviewMockupAsset();
  const approved = asset.approvalStatus === "approved";
  const rejected = asset.approvalStatus === "rejected";
  const state = STATE[asset.approvalStatus] ?? PENDING_STATE;
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
        alt={`${asset.role} mock-up, ${state.label.toLowerCase()}`}
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
            {state.label}
          </span>
          {!readOnly && (
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant={approved ? "default" : "outline"}
                size="icon-sm"
                aria-label="Approve mock-up"
                aria-pressed={approved}
                title="Approve"
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
                aria-label="Reject mock-up"
                aria-pressed={rejected}
                title="Reject"
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

/** Placeholder cards while a product's mock-ups load, the size of the real ones so nothing jumps. */
export const MockupStripSkeleton = () => (
  <div
    className="flex gap-3 overflow-hidden px-3 pt-1 pb-3"
    aria-busy="true"
    aria-label="Loading mock-ups"
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
