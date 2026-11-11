"use client";

import Image from "next/image";
import { Plus, X } from "lucide-react";
import type { ReactNode } from "react";

import { mockupViewLabel } from "@/helpers/mockup-template";
import type { MockupView } from "@/types/mockup-templates";
import { cn } from "@/utils/cn";

export type MockupSideItem = {
  view: MockupView;
  /** A small picture of the side; none shows a plus, for a side that can still be added. */
  thumbnail: string | null;
  /** Drawn in place of the thumbnail, such as a live preview of the side with the settings being chosen. */
  preview?: ReactNode;
  /** What the side's button says when it is not just its name, such as that a photo can be added. */
  title?: string;
  /** A side that is shown but can't be made, such as one the chosen template has no photo of. */
  muted?: boolean;
  /** A side taken off the mock-up: gray, with a cross over it, so it never reads as a color change. */
  removed?: boolean;
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
        "bg-card flex items-center rounded-full border shadow-sm",
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
              "bg-ink-50 relative flex items-center justify-center overflow-hidden rounded-full transition-colors disabled:cursor-not-allowed",
              size === "sm" ? "size-7 border-[1.5px]" : "size-11 border-2",
              active === side.view ? "border-slate-900" : "border-ink-200 hover:border-ink-400",
              (side.removed || (!side.thumbnail && !side.preview)) && "border-dashed",
              side.muted && "opacity-40",
              side.removed && "[&_img]:opacity-30 [&_img]:grayscale"
            )}
          >
            {side.removed && (
              <X
                aria-hidden="true"
                className={cn(
                  "text-ink-600 absolute z-10",
                  size === "sm" ? "size-3.5" : "size-5"
                )}
                strokeWidth={2.5}
              />
            )}
            {side.removed ? (
              side.thumbnail ? (
                <Image
                  src={side.thumbnail}
                  alt=""
                  width={pixels}
                  height={pixels}
                  unoptimized
                  className="size-full object-contain"
                />
              ) : null
            ) : side.preview ? (
              side.preview
            ) : side.thumbnail ? (
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
                className={cn("text-ink-400", size === "sm" ? "size-3" : "size-4")}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
