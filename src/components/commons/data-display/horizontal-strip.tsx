"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

type HorizontalStripProps = {
  children: ReactNode;
  /** What the row holds, for the arrows' names, e.g. "mock-ups". */
  itemsLabel: string;
  /** Changes when the items do, so the arrows are worked out again. */
  itemCount: number;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "className">;

/**
 * One row of items that scrolls sideways, so many of them take little height. Arrows at the edges show while the row
 * goes on that way, and the mouse wheel scrolls it too: at either end the wheel scrolls the page as usual.
 * Give each item a fixed width and `shrink-0 snap-start`.
 */
export const HorizontalStrip = ({
  children,
  itemsLabel,
  itemCount,
  className,
  ...rest
}: HorizontalStripProps) => {
  const row = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ left: false, right: false });

  useEffect(() => {
    const element = row.current;
    if (!element) return;
    const measure = () =>
      setEnds({
        left: element.scrollLeft > 4,
        right: element.scrollLeft + element.clientWidth < element.scrollWidth - 4,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // Added by hand: React's wheel handler is passive, so it could not keep the page from scrolling too.
    const wheel = (event: WheelEvent) => {
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const delta = event.deltaMode === 1 ? event.deltaY * 40 : event.deltaY;
      const atStart = element.scrollLeft <= 0;
      const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      event.preventDefault();
      element.scrollBy({ left: delta, behavior: "instant" });
    };
    element.addEventListener("scroll", measure, { passive: true });
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
      element.removeEventListener("wheel", wheel);
    };
  }, [itemCount]);

  const scrollBy = (direction: 1 | -1) =>
    row.current?.scrollBy({ left: direction * row.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative w-full min-w-0">
      <div
        ref={row}
        {...rest}
        className={cn(
          "flex snap-x snap-proximity gap-2 overflow-x-auto p-0.5 pb-2 [scrollbar-width:thin]",
          className
        )}
      >
        {children}
      </div>
      {ends.left && (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Earlier ${itemsLabel}`}
          onClick={() => scrollBy(-1)}
          className="absolute top-[40%] left-1 z-10 -translate-y-1/2 rounded-full bg-card/95 shadow-sm hover:-translate-y-1/2"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
      )}
      {ends.right && (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`More ${itemsLabel}`}
          onClick={() => scrollBy(1)}
          className="absolute top-[40%] right-1 z-10 -translate-y-1/2 rounded-full bg-card/95 shadow-sm hover:-translate-y-1/2"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </div>
  );
};
