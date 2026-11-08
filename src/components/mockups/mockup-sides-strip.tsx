"use client";

import Image from "next/image";
import { Plus } from "lucide-react";

import { mockupViewLabel } from "@/helpers/mockup-template";
import type { MockupView } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

export type MockupSideItem = {
  view: MockupView;
  /** A small picture of the side; none shows a plus, for a side that can still be added. */
  thumbnail: string | null;
  /** What the side's button says when it is not just its name, such as that a photo can be added. */
  title?: string;
  /** A side that is shown but will not be kept, such as one being removed. */
  muted?: boolean;
};

type MockupSidesStripProps = {
  sides: MockupSideItem[];
  active: MockupView;
  onSelect: (view: MockupView) => void;
  /** "md" under a photo in a dialog, "sm" on a mock-up card. */
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
};

/** Round pictures of the sides of a garment (front, back, sleeves), one of them chosen. */
export const MockupSidesStrip = ({
  sides,
  active,
  onSelect,
  size = "md",
  disabled = false,
  className,
}: MockupSidesStripProps) => {
  const pixels = size === "sm" ? 28 : 44;
  return (
    <div
      role="tablist"
      aria-label="Sides of the garment"
      className={cn(
        "flex items-center rounded-full border bg-white shadow-sm",
        size === "sm" ? "gap-1 p-1" : "gap-1.5 p-1.5",
        className
      )}
    >
      {sides.map((side) => {
        const label = side.title ?? mockupViewLabel(side.view);
        return (
          <button
            key={side.view}
            type="button"
            role="tab"
            aria-selected={active === side.view}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={(event) => {
              // On a card the strip sits on a picture that opens large: choosing a side does only that.
              event.stopPropagation();
              onSelect(side.view);
            }}
            className={cn(
              "flex items-center justify-center overflow-hidden rounded-full bg-slate-50 transition-colors disabled:cursor-not-allowed",
              size === "sm" ? "size-7 border-[1.5px]" : "size-11 border-2",
              active === side.view ? "border-slate-900" : "border-slate-200 hover:border-slate-400",
              !side.thumbnail && "border-dashed",
              side.muted && "opacity-40"
            )}
          >
            {side.thumbnail ? (
              <Image
                src={side.thumbnail}
                alt=""
                width={pixels}
                height={pixels}
                unoptimized
                className="size-full object-contain"
              />
            ) : (
              <Plus
                className={cn("text-slate-400", size === "sm" ? "size-3" : "size-4")}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
