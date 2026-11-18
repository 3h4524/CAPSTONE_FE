"use client";

import Image from "next/image";
import { FileSpreadsheet, Gauge, Play } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";

import { BATCH_ROWS, CONNECTED_PLATFORMS, LISTING_TAGS } from "@/data/features-content";
import { type FeatureVisualId, PREVIEW_DESIGNS } from "@/data/landing-content";
import { cn } from "@/utils/cn";

const DesignVisual = () => {
  const { t } = useTranslation("common");
  return (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {PREVIEW_DESIGNS.map((design) => (
      <div key={design.name} className="flex flex-col gap-1.5">
        <div className="bg-print-surface relative aspect-4/3 overflow-hidden rounded-lg border">
          <Image
            src={design.imageSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, 200px"
            className="object-cover"
          />
        </div>
        <span className="text-muted-foreground text-xs">
          {t(`landing.productTypes.${design.productTypeKey}`, { defaultValue: design.productType })}
        </span>
      </div>
    ))}
  </div>
  );
};

const VideoVisual = () => (
  <div className="bg-surface-strong border-surface-strong relative mx-auto aspect-9/16 w-40 overflow-hidden rounded-[1.75rem] border-4 shadow-lg lg:w-44">
    <Image
      src="/images/dashboard/hero-merch-v4.webp"
      alt=""
      fill
      sizes="176px"
      className="object-cover"
    />
    <span className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-black/10" />
    <span className="absolute top-3 left-3 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      9:16
    </span>
    <span className="bg-surface-strong-foreground/90 absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md">
      <Play className="text-surface-strong size-5 fill-current" />
    </span>
    <span className="absolute right-3 bottom-4 left-3 h-1 overflow-hidden rounded-full bg-white/30">
      <span className="bg-surface-strong-foreground block h-full w-2/3 rounded-full" />
    </span>
  </div>
);

const ListingVisual = () => {
  const { t } = useTranslation("common");
  return (
  <div className="flex flex-col gap-3 rounded-lg border p-3">
    <div className="flex items-start justify-between gap-3">
      <p className="line-clamp-2 text-sm font-semibold">
        Vintage Sunset T-Shirt, Retro Graphic Tee, Gift for Him
      </p>
      <span className="bg-brand-soft text-brand-ink inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
        <Gauge className="size-3" />
        SEO 92
      </span>
    </div>
    <div className="flex flex-wrap gap-1.5">
      {LISTING_TAGS.map((tag) => (
        <span key={tag} className="text-muted-foreground rounded-md border px-2 py-0.5 text-[11px]">
          {tag}
        </span>
      ))}
      <span className="bg-muted rounded-md px-2 py-0.5 text-[11px] font-medium">{t("featuresPage.visuals.moreTags")}</span>
    </div>
  </div>
  );
};

const BatchVisual = () => {
  const { t } = useTranslation("common");
  return (
  <div className="flex flex-col gap-3 rounded-lg border p-3">
    {BATCH_ROWS.map((row, index) => (
      <div key={row.name} className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 font-medium">
            <FileSpreadsheet className="text-brand size-3.5 shrink-0" />
            <span className="truncate">{row.name}</span>
          </span>
          <span className="text-muted-foreground shrink-0">
            {t(`featuresPage.visuals.batchStatuses.${index}`, { defaultValue: row.status })}
          </span>
        </div>
        <span className="bg-muted h-1.5 overflow-hidden rounded-full">
          <span className={cn("bg-brand block h-full rounded-full", row.progressClass)} />
        </span>
      </div>
    ))}
  </div>
  );
};

const PlatformsVisual = () => {
  const { t } = useTranslation("common");
  return (
  <div className="grid gap-3 sm:grid-cols-2">
    {CONNECTED_PLATFORMS.map((platform) => (
      <div key={platform.name} className="flex items-center gap-3 rounded-lg border p-3">
        <span className="bg-brand-soft text-brand-ink flex size-9 shrink-0 items-center justify-center rounded-md">
          <platform.icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{platform.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {t(`featuresPage.visuals.platformDetails.${platform.name.toLowerCase()}`, { defaultValue: platform.detail })}
          </p>
        </div>
      </div>
    ))}
  </div>
  );
};

export const FEATURE_VISUALS: Record<FeatureVisualId, ComponentType> = {
  design: DesignVisual,
  video: VideoVisual,
  listing: ListingVisual,
  batch: BatchVisual,
  platforms: PlatformsVisual,
};
