"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { LightboxImage } from "@/types/commons";

type ImageLightboxProps = {
  images: LightboxImage[];
  /** The image shown, or null while the viewer is closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
};

// Opens a gallery picture large on the page, with the previous and next ones a click or an arrow key
// away, so looking closer never takes the person to another tab.
export const ImageLightbox = ({ images, index, onIndexChange }: ImageLightboxProps) => {
  const image = index === null ? undefined : images[index];
  const position = index ?? 0;
  const hasPrevious = position > 0;
  const hasNext = position < images.length - 1;

  const step = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft" && hasPrevious) onIndexChange(position - 1);
    if (event.key === "ArrowRight" && hasNext) onIndexChange(position + 1);
  };

  return (
    <Dialog open={image !== undefined} onOpenChange={(open) => !open && onIndexChange(null)}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-3 p-3 sm:max-w-5xl" onKeyDown={step}>
        {/* The title stays while the dialog animates closed, when the image is already gone. */}
        <div className="flex min-w-0 items-baseline gap-3 pt-1 pr-10 pl-1">
          <DialogTitle className="truncate text-sm font-medium">{image?.caption ?? "Image"}</DialogTitle>
          <DialogDescription className="shrink-0 text-xs tabular-nums">
            {images.length > 1 ? `${position + 1} / ${images.length}` : ""}
          </DialogDescription>
        </div>
        {image && (
          <>
            <div className="relative flex min-h-60 items-center justify-center overflow-hidden rounded-md bg-slate-100">
              <Image
                key={image.id}
                src={image.url}
                alt={image.alt}
                width={image.width ?? 1200}
                height={image.height ?? 1200}
                unoptimized
                className="h-auto max-h-[78vh] w-auto max-w-full object-contain"
              />
              {images.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous image"
                    disabled={!hasPrevious}
                    onClick={() => onIndexChange(position - 1)}
                    className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/90 shadow-sm hover:-translate-y-1/2"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next image"
                    disabled={!hasNext}
                    onClick={() => onIndexChange(position + 1)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/90 shadow-sm hover:-translate-y-1/2"
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
