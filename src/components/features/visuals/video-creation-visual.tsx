"use client";

import Image from "next/image";
import { Clapperboard, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const VIDEO_FRAME_SRC = "/images/dashboard/hero-merch-v4.webp";

/** A player showing a vertical 9:16 promo, the format Podivo renders, over a blurred copy of its frame. */
export const VideoCreationVisual = () => {
  const { t } = useTranslation("common");
  return (
    <Card className="gap-4 overflow-hidden p-0 shadow-lg" aria-hidden="true">
      <div className="bg-surface-strong relative flex aspect-video items-center justify-center overflow-hidden">
        <Image src={VIDEO_FRAME_SRC} alt="" fill sizes="(max-width: 1024px) 100vw, 900px" className="scale-110 object-cover opacity-40 blur-2xl" />
        <div className="relative aspect-9/16 h-[88%] overflow-hidden rounded-xl shadow-2xl">
          <Image src={VIDEO_FRAME_SRC} alt="" fill sizes="260px" className="object-cover" />
          <span className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-black/10" />
          <span className="bg-surface-strong-foreground/90 absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg">
            <Play className="text-surface-strong size-5 fill-current" />
          </span>
          <span className="absolute right-3 bottom-4 left-3 h-1 overflow-hidden rounded-full bg-white/30">
            <span className="bg-surface-strong-foreground block h-full w-2/3 rounded-full" />
          </span>
        </div>
        <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-3">
          <Badge className="bg-white/15 text-white">{t("featuresPage.visuals.etsyVideo")}</Badge>
          <Badge className="bg-white/15 text-white">0:12</Badge>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-5 pt-0">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Clapperboard className="text-brand size-4" />
          sunset-tee-promo.mp4
        </p>
        <Badge variant="outline">{t("featuresPage.visuals.verticalCut")}</Badge>
      </div>
    </Card>
  );
};
