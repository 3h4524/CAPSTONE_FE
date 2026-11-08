"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/utils/cn";

// How far the pointer moves before a press becomes a drag, so a plain click still clicks.
const DRAG_THRESHOLD = 4;

// A wheel turn in pixels, whether the mouse reports pixels, lines or pages.
const wheelPixels = (event: WheelEvent, element: HTMLElement) => {
  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 40;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * element.clientWidth;
  return delta;
};

/**
 * A row wider than its box, moved sideways without a scrollbar: arrows at either edge while there is
 * more to see that way, the mouse wheel while the pointer is over it, or dragging it with the mouse.
 * At either end the wheel scrolls the page again.
 */
export function ArrowScroller({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const track = useCallback(() => {
    if (!element) return;
    setCanBack(element.scrollLeft > 1);
    setCanForward(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  }, [element]);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(track);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    track();

    // The wheel moves the row sideways; React's wheel handler is passive, so this one is set by hand
    // to be allowed to stop the page from scrolling too.
    const onWheel = (event: WheelEvent) => {
      const pixels = wheelPixels(event, element);
      const atStart = element.scrollLeft <= 0 && pixels < 0;
      const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1 && pixels > 0;
      if (pixels === 0 || atStart || atEnd) return;
      event.preventDefault();
      element.scrollBy({ left: pixels });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", onWheel);
    };
  }, [element, track]);

  const go = (direction: -1 | 1) => element?.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className={cn("relative", className)}>
      <div
        ref={setElement}
        onScroll={track}
        aria-label={label}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button !== 0 || !element) return;
          drag.current = { x: event.clientX, left: element.scrollLeft, moved: false };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || !element) return;
          const distance = event.clientX - start.x;
          if (!start.moved && Math.abs(distance) < DRAG_THRESHOLD) return;
          if (!start.moved) {
            start.moved = true;
            setIsDragging(true);
            element.setPointerCapture(event.pointerId);
          }
          element.scrollLeft = start.left - distance;
        }}
        onPointerUp={() => {
          drag.current = null;
          setIsDragging(false);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setIsDragging(false);
        }}
        // A drag that ends over a step must not also count as a click on it.
        onClickCapture={(event) => {
          if (isDragging) event.stopPropagation();
        }}
        className={cn(
          "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          (canBack || canForward) && "cursor-grab",
          isDragging && "cursor-grabbing select-none"
        )}
      >
        {children}
      </div>
      <EdgeArrow side="left" visible={canBack} onClick={() => go(-1)} />
      <EdgeArrow side="right" visible={canForward} onClick={() => go(1)} />
    </div>
  );
}

function EdgeArrow({ side, visible, onClick }: { side: "left" | "right"; visible: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 flex w-16 items-center transition-opacity duration-200",
        side === "left" ? "left-0 justify-start bg-linear-to-r" : "right-0 justify-end bg-linear-to-l",
        "from-card via-card/80 to-transparent",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <button
        type="button"
        aria-label={side === "left" ? "Scroll back" : "Scroll forward"}
        tabIndex={visible ? 0 : -1}
        onClick={onClick}
        className={cn(
          "flex size-9 items-center justify-center rounded-full border border-ink-200 bg-card text-ink-600 shadow-md transition hover:scale-105 hover:text-ink-900",
          visible && "pointer-events-auto"
        )}
      >
        <Icon className="size-4.5" />
      </button>
    </div>
  );
}
