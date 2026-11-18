"use client";

import Image from "next/image";
import { CircleCheck, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HERO_PREVIEW, PREVIEW_DESIGNS } from "@/data/landing-content";

/** A drawn batch screen beside the hero: product art, progress and the send-to-shop step. */
export const HeroPreview = () => {
  const { t } = useTranslation("common");
  return (
    <div
      className="bg-card overflow-hidden rounded-xl border shadow-[0_24px_60px_-24px_rgba(39,55,80,0.35)]"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="bg-ink-200 size-2.5 rounded-full" />
        <span className="bg-ink-200 size-2.5 rounded-full" />
        <span className="bg-ink-200 size-2.5 rounded-full" />
        <span className="text-muted-foreground ml-2 truncate font-mono text-[11px]">
          {HERO_PREVIEW.address}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="bg-brand-soft text-brand-ink flex size-8 shrink-0 items-center justify-center rounded-md">
                <Layers className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{HERO_PREVIEW.batchName}</p>
                <p className="text-muted-foreground text-xs">
                  {t("landing.preview.batchDetail", { count: 24, defaultValue: HERO_PREVIEW.batchDetail })}
                </p>
              </div>
            </div>
            <span className="bg-muted text-foreground shrink-0 rounded-md px-2 py-0.5 text-xs font-medium">
              {t("landing.preview.generating", { defaultValue: HERO_PREVIEW.progressLabel })} {HERO_PREVIEW.progressPercent}%
            </span>
          </div>
          <span className="bg-muted mt-3 block h-1.5 overflow-hidden rounded-full">
            <span
              className="bg-brand block h-full rounded-full"
              style={{ width: `${HERO_PREVIEW.progressPercent}%` }}
            />
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {PREVIEW_DESIGNS.slice(0, 3).map((design) => (
            <div key={design.name} className="overflow-hidden rounded-lg border">
              {/* 4:3 like the artwork itself, so every design fills its tile the same way. */}
              <div className="bg-print-surface relative aspect-4/3">
                <Image
                  src={design.imageSrc}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 30vw, 200px"
                  className="object-cover"
                />
                <span className="bg-surface-strong text-surface-strong-foreground absolute top-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                  {t(`landing.productTypes.${design.productTypeKey}`, { defaultValue: design.productType })}
                </span>
              </div>
              <p className="line-clamp-2 border-t px-2 py-2 text-[11px] leading-tight font-semibold sm:px-2.5 sm:text-xs">{design.name}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-lg border p-3">
          <CircleCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{t("landing.preview.tagsFilled", { defaultValue: HERO_PREVIEW.tagsLine })}</p>
            <p className="text-muted-foreground truncate text-[11px]">{HERO_PREVIEW.tagsDetail}</p>
          </div>
          <span className="text-muted-foreground hidden rounded-md border px-2 py-1 text-[11px] font-medium sm:inline">
            Printify
          </span>
          <span className="bg-surface-strong text-surface-strong-foreground rounded-md px-2 py-1 text-[11px] font-semibold">
            {t("landing.preview.etsyDraft")}
          </span>
        </div>
      </div>
    </div>
  );
};
