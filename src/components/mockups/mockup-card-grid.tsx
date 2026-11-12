"use client";

import { type ReactNode, useState } from "react";

import { PhonePager } from "@/components/commons/data-display/phone-pager";
import { useIsPhone } from "@/hooks/use-is-phone";
import { cn } from "@/utils/cn";

// Three rows of two fit a phone's screen; a longer list continues on the next page.
const PHONE_PAGE_SIZE = 6;

type MockupCardGridProps<T> = {
  items: T[];
  renderItem: (item: T) => ReactNode;
  pagerLabel: string;
  className?: string;
};

/** The photo cards of the mock-ups page: every card on larger screens, a page at a time on a phone. */
export const MockupCardGrid = <T,>({ items, renderItem, pagerLabel, className }: MockupCardGridProps<T>) => {
  const isPhone = useIsPhone();
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / PHONE_PAGE_SIZE));
  // Deleting the last card of the last page leaves that page empty.
  const currentPage = Math.min(page, pageCount);
  const shownItems = isPhone ? items.slice((currentPage - 1) * PHONE_PAGE_SIZE, currentPage * PHONE_PAGE_SIZE) : items;

  return (
    // The pager brings its own room for the floating assistant button; a single page needs it here.
    <div className={cn("flex flex-col gap-4 max-md:gap-3", pageCount === 1 && "max-md:pb-14")}>
      <div className={cn("grid gap-4 max-md:grid-cols-2 max-md:gap-2 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {shownItems.map(renderItem)}
      </div>
      {isPhone && <PhonePager page={currentPage} pageCount={pageCount} onPageChange={setPage} label={pagerLabel} />}
    </div>
  );
};
