"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/utils/cn";

const GAP = 16;
// More plans than this slide sideways instead of wrapping onto a second row.
export const PLANS_PER_ROW = 4;

// The narrowest a plan card reads well at.
const MIN_CARD_WIDTH = 300;

// How many cards fit side by side at this width, never more than a row of four. Before the width
// is known (first render), a full row.
const perViewFor = (width: number) =>
  width <= 0 ? PLANS_PER_ROW : Math.max(1, Math.min(PLANS_PER_ROW, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP))));

// Plans always sit in one row, as on the Seller's billing page: up to four at once, and any that
// do not fit slide sideways with arrows instead of wrapping onto a second row.
// Card widths are worked out here rather than in class names, so any number of plans lays out the same.
export function PlanCarousel({ items }: { items: { key: string; node: ReactNode }[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [first, setFirst] = useState(0);
  const perView = perViewFor(width);
  const slides = items.length > perView;

  const step = width > 0 ? (width - (perView - 1) * GAP) / perView + GAP : 0;
  const track = useCallback(() => {
    const element = scroller.current;
    if (element && step > 0) setFirst(Math.round(element.scrollLeft / step));
  }, [step]);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  useEffect(track, [track, items.length]);

  const last = Math.min(items.length, first + perView);
  const go = (direction: -1 | 1) => scroller.current?.scrollBy({ left: direction * step * perView, behavior: "smooth" });
  // Without sliding, as many columns as plans (up to the row), so a short list fills the row.
  const columns = slides ? perView : Math.min(perView, items.length);

  const scrollerNode = (
    <div
      ref={scroller}
      onScroll={track}
      className={cn("flex", slides ? "min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1 max-sm:order-first max-sm:basis-full" : "flex-wrap")}
      style={{ gap: GAP, scrollbarWidth: slides ? "none" : undefined }}
      aria-label={slides ? `Plans ${first + 1} to ${last} of ${items.length}` : undefined}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className="flex min-w-0 snap-start"
          style={{ flex: `0 0 calc((100% - ${(columns - 1) * GAP}px) / ${columns})`, maxWidth: items.length === 1 ? 576 : undefined }}
        >
          {item.node}
        </div>
      ))}
    </div>
  );

  if (!slides) return scrollerNode;

  // The arrows sit in their own space beside the cards, never over them.
  return (
    <div>
      <div className="flex items-center gap-3 max-sm:flex-wrap max-sm:justify-center">
        <ArrowButton side="left" disabled={first <= 0} onClick={() => go(-1)} />
        {scrollerNode}
        <ArrowButton side="right" disabled={last >= items.length} onClick={() => go(1)} />
      </div>
      <p className="text-ink-500 mt-2 text-center text-xs tabular-nums">
        Plans {first + 1}–{last} of {items.length}
      </p>
    </div>
  );
}

function ArrowButton({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous plans" : "Next plans"}
      disabled={disabled}
      onClick={onClick}
      className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 flex size-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="size-5" />
    </button>
  );
}
