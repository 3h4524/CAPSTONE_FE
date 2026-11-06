"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/utils/cn";

export type PhonePlanItem = {
  key: string;
  label: string;
  node: ReactNode;
  isRecommended?: boolean;
};

type PhonePlanCarouselProps = {
  items: PhonePlanItem[];
  // The plan to open on; the first one when there is none.
  initialKey?: string;
};

/** The plans on a phone: one card at a time with the next one peeking in, and a tab naming each plan. */
export const PhonePlanCarousel = ({ items, initialKey }: PhonePlanCarouselProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(() => Math.max(0, items.findIndex((item) => item.key === initialKey)));

  const scrollToCard = (index: number, behavior: ScrollBehavior) => {
    const scroller = scrollerRef.current;
    const card = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !card) return;
    scroller.scrollTo({ left: card.offsetLeft - parseFloat(getComputedStyle(scroller).paddingLeft), behavior });
  };

  useLayoutEffect(() => {
    scrollToCard(active, "auto");
    // Only where the carousel opens: from then on the Seller's swipes and taps move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tabs = tabsRef.current;
    const tab = tabs?.children[active] as HTMLElement | undefined;
    if (!tabs || !tab) return;
    tabs.scrollTo({ left: tab.offsetLeft - (tabs.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  // The card nearest the start of the row is the one on show.
  const followScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const start = scroller.scrollLeft + parseFloat(getComputedStyle(scroller).paddingLeft);
    const distances = [...scroller.children].map((card) => Math.abs((card as HTMLElement).offsetLeft - start));
    setActive(distances.indexOf(Math.min(...distances)));
  };

  return (
    <div className="space-y-3">
      <div
        ref={tabsRef}
        role="group"
        aria-label="Choose a plan"
        className="bg-muted relative flex gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={index === active}
            className={cn(
              "focus-visible:ring-ring/40 inline-flex min-h-9 flex-1 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2",
              index === active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            onClick={() => scrollToCard(index, "smooth")}
          >
            {item.label}
            {item.isRecommended && <Star className="size-3 fill-orange-400 text-orange-400" aria-hidden="true" />}
          </button>
        ))}
      </div>
      {/* Reaches the screen's edges, so the next card is cut off there rather than in mid-page. Each card is as tall as the tallest. */}
      <div
        ref={scrollerRef}
        onScroll={followScroll}
        className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <div key={item.key} className="flex w-[88%] shrink-0 snap-start *:w-full">
            {item.node}
          </div>
        ))}
      </div>
    </div>
  );
};
