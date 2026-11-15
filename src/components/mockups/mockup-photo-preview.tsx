"use client";

import type { CSSProperties } from "react";

import type { MockupTemplate } from "@/types/mockup-templates";

type MockupPhotoPreviewProps = {
  photo: Pick<
    MockupTemplate,
    "baseImageUrl" | "garmentMaskUrl" | "outputWidthPx" | "outputHeightPx"
  >;
  /** The garment recolored, when the photo has a garment mask. */
  garmentColor?: string | null;
  /** The garment lifted onto this color, when the photo has a garment mask. */
  background?: string | null;
};

const masked = (url: string): CSSProperties => ({
  maskImage: `url(${url})`,
  WebkitMaskImage: `url(${url})`,
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
});

/**
 * A template photo as a mock-up with these settings would show it, drawn the way the print area editor draws it:
 * small enough for a side's thumbnail, so a change of color or background shows on every side at once.
 */
export const MockupPhotoPreview = ({
  photo,
  garmentColor,
  background,
}: MockupPhotoPreviewProps) => {
  const mask = photo.garmentMaskUrl;
  const cutOut = background && mask ? masked(mask) : undefined;
  return (
    <span
      className="flex size-full items-center justify-center"
      style={cutOut ? { backgroundColor: background ?? undefined } : undefined}
    >
      <span
        className="relative block max-h-full max-w-full"
        style={{
          aspectRatio: `${photo.outputWidthPx || 1} / ${photo.outputHeightPx || 1}`,
          height: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn under a CSS mask like the editor's photo */}
        <img
          src={photo.baseImageUrl}
          alt=""
          className="absolute inset-0 size-full object-fill"
          style={cutOut}
        />
        {garmentColor && mask && (
          <span
            aria-hidden="true"
            className="absolute inset-0 mix-blend-multiply"
            style={{ backgroundColor: garmentColor, ...masked(mask) }}
          />
        )}
      </span>
    </span>
  );
};
