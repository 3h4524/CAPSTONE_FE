"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type PhonePagerProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
  /** Where the list starts, when that is not the top of the page. */
  anchorId?: string;
};

/** Previous and Next for a list shown a few items at a time, which then starts again from its top.
 * The bottom padding keeps Next clear of the floating assistant button. */
export const PhonePager = ({ page, pageCount, onPageChange, label, anchorId }: PhonePagerProps) => {
  if (pageCount <= 1) return null;

  const goTo = (next: number) => {
    onPageChange(next);
    const anchor = anchorId ? document.getElementById(anchorId) : null;
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const main = document.querySelector("main");
    const scroller = main && main.scrollHeight > main.clientHeight ? main : main?.parentElement;
    scroller?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2 pb-14">
      <Button type="button" variant="outline" size="sm" className="bg-card px-3" disabled={page <= 1} onClick={() => goTo(page - 1)}>
        <ChevronLeft aria-hidden="true" />
        Previous
      </Button>
      <p className="text-muted-foreground text-xs tabular-nums">
        Page {page} of {pageCount}
      </p>
      <Button type="button" variant="outline" size="sm" className="bg-card px-3" disabled={page >= pageCount} onClick={() => goTo(page + 1)}>
        Next
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
};
